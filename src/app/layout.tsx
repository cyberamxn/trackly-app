import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/trackly/ThemeProvider";
import { ThemeColorSync } from "@/components/trackly/ThemeColorSync";
import { AuthProvider } from "@/lib/supabase/auth";
import { AutoSaveHook } from "@/lib/supabase/autoSave";
import { NetworkStatusHook } from "@/lib/supabase/networkStatus";
import { ServiceWorkerRegister } from "@/components/trackly/ServiceWorkerRegister";
import { VersionGuard } from "@/components/trackly/VersionGuard";
import { IOSViewportFix } from "@/components/trackly/IOSViewportFix";
import { RefCapture } from "@/components/trackly/RefCapture";
import { SessionProvider } from "@/components/admin/SessionProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for resolving OG/canonical image & URL paths.
  metadataBase: new URL("https://trackly.today"),
  title: {
    default: "Trackly — Premium Daily Life Tracker",
    template: "%s · Trackly",
  },
  description:
    "All-in-one daily tracking app for personal life management. Expenses, shopping, habits, routines, notes, reminders, and simple analytics — in a pure black & white, distraction-free design.",
  manifest: "/manifest.json",
  // hreflang languages are set per-page (page-level alternates replace
  // these) — each public page points them at its OWN URL, since this is a
  // single-language site.
  // Social link previews (WhatsApp/Telegram/X) — shared og-image everywhere.
  openGraph: {
    type: "website",
    siteName: "Trackly",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trackly — One app for your whole life" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.png"],
  },
  // iOS standalone PWA: proper app name on home screen + real app icon
  // (instead of a Safari screenshot tile) + black status bar area.
  appleWebApp: {
    capable: true,
    // "black" (not "black-translucent"): solid BLACK status-bar zone while
    // the webview stays INSET below it — the original app size from the
    // beginning (pre viewport-fit=cover era), just black instead of white.
    statusBarStyle: "black",
    title: "Trackly",
  },
  // Trackly logo in browser/OS chrome EVERYWHERE (Task 42 — owner reverted
  // the Task 29b "no logo" blanking): branded favicon.ico (16/32) for the
  // Chrome tab, plus PNG 192/512 — both multiples of 48px, which is what
  // Google Search requires to show the logo next to search results.
  // Apple-touch-icon (180x180) = real iOS home-screen install tile.
  // PWA manifest icons restored in public/manifest.json.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Google AdSense site ownership verification (ca-pub-8667404812332337) —
  // root layout metadata = every page inherits this meta tag.
  // Google Search Console ownership verification (HTML-tag method) — same
  // token works for the URL-prefix property https://trackly.today.
  other: {
    "google-adsense-account": "ca-pub-8667404812332337",
    "google-site-verification": "rkqz9AEA2AZHtSYi-fERrezHHR9848NDnawmm4rHugE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  // NO viewport-fit=cover — the webview stays inset between the status bar
  // and the home-indicator zone (the original app size). "Upper white" is
  // solved by the solid black status bar (statusBarStyle: "black" + solid
  // black theme-color), NOT by stretching the webview under it.
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable}`}>
      <head>
        {/* Explicit iOS standalone flag — Next's metadata API emits the
            modern un-prefixed variant; keep the classic one too so every
            iOS version launches Trackly as a standalone home-screen app. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased bg-background text-foreground font-sans">
        <AuthProvider>
          <SessionProvider>
            <ThemeProvider>
              <ThemeColorSync />
              <VersionGuard />
              <AutoSaveHook />
              <NetworkStatusHook />
              <RefCapture />
              <ServiceWorkerRegister />
              <IOSViewportFix />
              {children}
              <Toaster />
              <SonnerToaster position="top-center" />
            </ThemeProvider>
          </SessionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
