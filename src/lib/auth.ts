import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// ===== Login brute-force protection =====
// In-memory sliding-window rate limiter (single-server deployment).
// 5 failed attempts per email within 15 minutes → temporary lockout.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
const loginFailures = new Map<string, { count: number; firstAt: number }>();

function isLoginBlocked(email: string): boolean {
  const rec = loginFailures.get(email);
  if (!rec) return false;
  if (Date.now() - rec.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.delete(email);
    return false;
  }
  return rec.count >= LOGIN_MAX_FAILURES;
}

function recordLoginFailure(email: string): void {
  const now = Date.now();
  const rec = loginFailures.get(email);
  if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginFailures.set(email, { count: 1, firstAt: now });
  } else {
    rec.count++;
  }
  // Opportunistic cleanup of stale entries (memory hygiene)
  if (loginFailures.size > 1000) {
    for (const [k, v] of loginFailures) {
      if (now - v.firstAt > LOGIN_WINDOW_MS) loginFailures.delete(k);
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const emailKey = credentials.email.toLowerCase().trim();

        // Brute-force guard: too many recent failures → reject outright.
        if (isLoginBlocked(emailKey)) {
          console.warn(`[admin-auth] Rate limit hit for ${emailKey}`);
          return null;
        }

        const admin = await db.adminUser.findUnique({
          where: { email: emailKey },
        });
        if (!admin) {
          recordLoginFailure(emailKey);
          return null;
        }
        if (admin.status !== "ACTIVE") {
          recordLoginFailure(emailKey);
          return null;
        }
        const valid = await bcrypt.compare(credentials.password, admin.passwordHash);
        if (!valid) {
          recordLoginFailure(emailKey);
          return null;
        }

        // Successful login clears the failure counter for this email.
        loginFailures.delete(emailKey);

        // Update last login
        await db.adminUser.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date(), lastLoginIp: "127.0.0.1" },
        });

        // Audit log
        await db.auditLog.create({
          data: {
            adminId: admin.id,
            action: "LOGIN",
            entityType: "ADMIN_USER",
            entityId: admin.id,
            metadata: JSON.stringify({ email: admin.email }),
            ipAddress: "127.0.0.1",
          },
        });

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/6207" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "trackly-admin-secret-dev-only-please-change-in-production",
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
