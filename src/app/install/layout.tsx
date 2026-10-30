import type { Metadata } from "next";

// Public metadata for the install guide (the landing page sets its own).
// The install page itself is a client component — a server layout is the
// clean Next.js way to attach metadata to it.
export const metadata: Metadata = {
  title: "Install Trackly on iPhone & Android",
  description:
    "Install Trackly as a real app in 30 seconds: iPhone — open trackly.today in Safari, tap Share, then Add to Home Screen. Android — open in Chrome and tap Install. Free, offline-ready, no app store needed.",
  alternates: {
    canonical: "/install",
    languages: { "en-IN": "/install", en: "/install", "x-default": "/install" },
  },
};

export default function InstallLayout({ children }: { children: React.ReactNode }) {
  return children;
}
