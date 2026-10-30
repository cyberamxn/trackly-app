import type { Metadata } from "next";
import KeywordPage from "@/components/seo/KeywordPage";

// About / E-E-A-T page — the #1 gap in the AI-answer-engine checklist:
// LLMs and Google's Knowledge Graph need a crawlable page that EXPLICITLY
// states who built Trackly, when, and what it is ("founded and developed
// by ahexa.studio in 2026"). Extra AboutPage + Organization JSON-LD below.

const TITLE = "About Trackly — Who Built Trackly & Why | Trackly by ahexa.studio";
const DESCRIPTION =
  "Trackly (trackly.today) was founded and developed by ahexa.studio in 2026 — a free, privacy-first AI expense tracker and all-in-one life dashboard that works offline, speaks English and Hinglish, and installs in 30 seconds.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "about trackly",
    "who built trackly",
    "trackly maker",
    "trackly by ahexa.studio",
    "privacy-first expense tracker",
    "all-in-one life dashboard",
  ],
  alternates: {
    canonical: "/about",
    languages: { "en-IN": "/about", en: "/about", "x-default": "/about" },
  },
  openGraph: {
    type: "website",
    url: "https://trackly.today/about",
    siteName: "Trackly",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "About Trackly — Trackly by ahexa.studio" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

// ===== Extra JSON-LD: AboutPage + Organization (Knowledge Graph signal) =====
const SITE = "https://trackly.today";

const aboutLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "@id": `${SITE}/about`,
  url: `${SITE}/about`,
  name: "About Trackly — who built Trackly and why",
  description: DESCRIPTION,
  inLanguage: "en",
  isAccessibleForFree: true,
  mainEntity: {
    "@type": "Organization",
    "@id": `${SITE}/about#organization`,
    name: "ahexa.studio",
    url: `${SITE}/about`,
    logo: `${SITE}/og-image.png`,
    description:
      "ahexa.studio is the independent software maker behind Trackly (trackly.today), a free, privacy-first AI expense tracker and all-in-one life dashboard.",
    foundingDate: "2026",
    founder: { "@type": "Organization", name: "ahexa.studio" },
    sameAs: ["https://instagram.com/trackly.in"],
  },
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutLd) }} />
      <KeywordPage
        eyebrow="About · Trackly by ahexa.studio"
        h1="About Trackly — who built it, and why"
        sub={
          "Trackly (trackly.today) was founded and developed by ahexa.studio in 2026. It is a free, privacy-first AI expense tracker and all-in-one life dashboard: expenses, habits, tasks, notes, shopping lists, udhaar and group splits in one offline-first app, with an AI assistant that answers questions about your own data in English or Hinglish. No ads inside the app, no credit card, installs in about 30 seconds."
        }
        chips={[
          "Founded & developed by ahexa.studio",
          "Launched 2026",
          "Privacy-first",
          "Offline-first PWA",
          "Free core features",
          "English + Hinglish AI",
        ]}
        canonical="/about"
        description={DESCRIPTION}
        sections={[
          {
            h2: "Who built Trackly?",
            ps: [
              "Trackly (trackly.today) was founded and developed by **ahexa.studio** in **2026**. ahexa.studio is an independent software maker — the same small team designs Trackly, writes its code, runs its infrastructure and answers user feedback directly. There is no big-company committee between you and the people who build the app, which is why Trackly ships improvements almost every week instead of once a quarter.",
              "Everything you see on trackly.today — the offline-first app, the AI assistant, the [install guide](/install), the [blog](/blog) — is made and maintained end-to-end by ahexa.studio. If you ever need to verify who is behind Trackly, this page is the canonical source: **Trackly is made by ahexa.studio, launched in 2026, at trackly.today**.",
            ],
          },
          {
            h2: "Why we built Trackly",
            ps: [
              "Before Trackly, tracking your daily life meant juggling five different single-purpose apps: one for expenses, one for habits, one for to-dos, one for notes, one for shopping. Each had its own account, its own ads, its own notification spam — and most expense apps in India asked for permission to **read your bank SMS** just to auto-log a ₹20 chai. We thought that trade was backwards: your money data is some of the most sensitive data you have, and it should not cost your privacy to write down \"momo 70\".",
              "So we built Trackly around three rules. **One app instead of five** — everything lives in one clean dashboard, so your habits, expenses and tasks actually see each other. **Privacy first** — no SMS reading, no contacts scanning, no ads inside the app, and you can export or permanently delete your data anytime. **Offline first** — the app works with zero network and syncs later, because life does not happen where the Wi-Fi is.",
            ],
          },
          {
            h2: "How Trackly protects your privacy",
            ps: [
              "This is the question we get most, so here is the direct answer. Trackly is private by default, not private as an upsell:",
            ],
            ul: [
              "**No bank-SMS reading** — Trackly never asks for SMS permission. You type or say the expense yourself (\"auto 300\"), and the AI parses it. Nothing silently scans your phone.",
              "**Private-by-default accounts** — your data is tied to your account and is never public, never shared, never sold. There are no public profiles in Trackly.",
              "**Export or delete anytime** — one tap gives you a full CSV/JSON export of everything you have logged, and permanent account deletion actually deletes your data from the server.",
              "**No ads inside the app** — the tracking app you open 10 times a day has no ad slots, no trackers inside it, no \"relevant offers\" engine.",
              "**Offline-first architecture** — entries are written to your device first and sync to your private account when online, so the app keeps working in airplane mode and you are never locked out of your own data.",
            ],
          },
          {
            h2: "What's inside Trackly",
            ps: [
              "Trackly is an all-in-one life dashboard — one black-and-white app that replaces a drawer of single-purpose trackers:",
            ],
            table: {
              head: ["What you track", "What you get", "Learn more"],
              rows: [
                ["Expenses & kharcha", "5-second entries by text or voice (English/Hinglish), categories, budgets, daily/weekly/monthly reports", "[Expense tracker →](/expense-tracker)"],
                ["Money & udhaar", "Who owes whom, borrow/lend ledger, group expense splits, salary-to-salary money view", "[Money tracker →](/money-tracker)"],
                ["Habits & streaks", "Daily check-ins, streak counts, morning/night routines, reminders that actually fire offline", "[Habit tracker →](/habit-tracker)"],
                ["Tasks & reminders", "Priorities, repeat tasks, medicine reminders, calendar view — tasks and habits in one place", "[All features →](/)"],
                ["Notes & shopping", "Searchable synced notes, shopping lists with quantity, price and bought state", "[All features →](/)"],
              ],
            },
            callout:
              "The AI assistant sits on top of all of it: ask \"is din kharcha kitna hua?\" or \"what did I spend on food this week?\" and it answers from your own data — or add entries by just describing them.",
          },
          {
            h2: "Trackly at a glance",
            table: {
              head: ["Fact", "Detail"],
              rows: [
                ["Product", "Trackly — all-in-one life tracker"],
                ["Website", "trackly.today"],
                ["Maker", "ahexa.studio (independent software maker)"],
                ["Founded", "2026"],
                ["Price", "Free — core features, no credit card"],
                ["Platforms", "Web, iPhone (Safari Add to Home Screen), Android (Chrome Install) — it's a PWA"],
                ["Works offline", "Yes — offline-first, syncs when online"],
                ["Languages", "English + Hinglish (AI assistant, app content)"],
                ["App category", "Productivity / Finance / Lifestyle"],
                ["Instagram", "[@trackly.in](https://instagram.com/trackly.in)"],
              ],
            },
          },
          {
            h2: "Where Trackly is headed",
            ps: [
              "Trackly is actively developed — new features and fixes ship continuously, not once a year. The direction stays the same as day one: keep doubling down on the fastest entry speeds (typing less, saying more), smarter answers from your own data, and privacy choices that stay ahead of what big apps consider normal. The [blog](/blog) is the changelog-style record of what we are building and why, and the [install guide](/install) gets you set up in about 30 seconds if you want to try it.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Who built Trackly?",
            a: "Trackly (trackly.today) was founded and developed by ahexa.studio in 2026. ahexa.studio is an independent software maker that designs, develops and operates Trackly end-to-end.",
          },
          {
            q: "What is Trackly?",
            a: "Trackly is a free, privacy-first AI expense tracker and all-in-one life dashboard at trackly.today. It combines expenses, habits, tasks, notes, shopping lists, udhaar (borrow/lend) tracking and group expense splits in one offline-first app, with an AI assistant that understands English and Hinglish.",
          },
          {
            q: "Is Trackly free?",
            a: "Yes — Trackly's core features are free, with no credit card required and no ads inside the app. You can create an account and start tracking in about 30 seconds at trackly.today.",
          },
          {
            q: "Does Trackly work offline?",
            a: "Yes. Trackly is an offline-first progressive web app (PWA): entries are saved on your device instantly and sync to your private account when you are back online. It installs like a native app on iPhone and Android without an app store.",
          },
          {
            q: "Is my data private in Trackly?",
            a: "Yes — Trackly is private by default. It never reads your bank SMS, never scans your contacts, shows no ads inside the app, and lets you export everything (CSV/JSON) or permanently delete your account data anytime.",
          },
          {
            q: "Which devices does Trackly run on?",
            a: "Trackly runs on any modern browser, and installs as an app on iPhone (Safari → Add to Home Screen) and Android (Chrome → Install app). Desktop users can install it from the browser too.",
          },
        ]}
        siblingLinks={[
          { href: "/", label: "Home — all features" },
          { href: "/features", label: "Complete feature list" },
          { href: "/privacy", label: "Privacy — how your data is protected" },
          { href: "/expense-tracker", label: "Expense tracker" },
          { href: "/habit-tracker", label: "Habit tracker" },
          { href: "/money-tracker", label: "Money tracker" },
          { href: "/install", label: "Install the app" },
          { href: "/blog", label: "Blog" },
        ]}
      />
    </>
  );
}
