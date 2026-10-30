"use client";

import { useSession } from "next-auth/react";
import { LoginScreen } from "@/components/admin/LoginScreen";
import { AdminShell } from "@/components/admin/AdminShell";

export default function AdminPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-foreground flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-background flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-background" />
            </div>
          </div>
          <p className="text-[14px] text-muted-foreground">Loading Trackly Admin…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <AdminShell />;
}
