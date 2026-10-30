import type { Metadata } from "next";

// The PWA shell is an auth-gated app, not public content — keep it out of
// search indexes so the landing page (with real content) ranks for "Trackly"
// instead of a bare login screen.
export const metadata: Metadata = {
  title: "Trackly",
  robots: { index: false, follow: false },
  // Trackly logo in the browser tab on /app too (Task 42 — owner reverted
  // the Task 29b blanking). A child segment's `icons` REPLACES the root
  // layout's icons for /app and everything below it, so we repeat the same
  // branded set here: favicon.ico (tab), 192/512 PNGs (PWA + crawler) and
  // the real apple-touch-icon for iOS home-screen installs.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
