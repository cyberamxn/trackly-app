import type { Metadata } from "next";
import KeywordPage from "@/components/seo/KeywordPage";

// Public privacy page — the in-app Privacy & Legal screen is auth-gated,
// so crawlers and AI answer engines could never read it. This public page
// mirrors its facts (same compliance, same rights, same contact) so
// "is Trackly private / how does Trackly protect data" queries get a
// crawlable, quotable answer. Made by ahexa.studio — see /about.

const TITLE = "Privacy — No Bank-SMS Reading, No Ads, Export & Delete Anytime | Trackly";
const DESCRIPTION =
  "Trackly is private by default: no bank-SMS reading, no contact scanning, no ads inside the app, encrypted sync, full CSV/JSON export and permanent deletion anytime. DPDP Act 2023, GDPR & CCPA aligned. Made by ahexa.studio.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "trackly privacy",
    "is trackly safe",
    "privacy-first expense tracker",
    "expense tracker without sms permission",
    "dpdp act compliant app",
  ],
  alternates: {
    canonical: "/privacy",
    languages: { "en-IN": "/privacy", en: "/privacy", "x-default": "/privacy" },
  },
  openGraph: {
    type: "website",
    url: "https://trackly.today/privacy",
    siteName: "Trackly",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trackly Privacy" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

export default function PrivacyPage() {
  return (
    <KeywordPage
      eyebrow="Privacy · Trackly by ahexa.studio"
      h1="Trackly Privacy — your data stays yours"
      sub={
        "Trackly never reads your bank SMS, never scans your contacts, and shows no ads inside the app. Everything you log is written to your device first, synced encrypted to your private account, and stays yours: export everything as CSV/JSON or permanently delete it anytime. Trackly is made by ahexa.studio and aligned with the Indian DPDP Act 2023, GDPR, CCPA and IT Act 2000 standards."
      }
      chips={[
        "No bank-SMS access",
        "No contact scanning",
        "No ads inside the app",
        "Encrypted sync",
        "Export anytime",
        "Permanent deletion",
      ]}
      canonical="/privacy"
      description={DESCRIPTION}
      sections={[
        {
          h2: "The short answer: how Trackly protects your privacy",
          ps: [
            "Most expense apps in India ask for SMS permission so they can auto-detect spends from bank messages. Trackly takes the opposite approach: **you type or say the expense yourself** (\"auto 300\", \"momo 70\") and the built-in AI parses it. Nothing on your phone is silently scanned, and no message ever leaves your device unless you typed it into Trackly yourself.",
            "Trackly is private by default — privacy is not an upsell tier. Your entries live on your device first (that is why the app works offline), sync to your private account when online, and are **never shared or sold** to anyone. There are no public profiles, no social feeds, no \"anonymized\" data resale, and no ad SDKs inside the app.",
          ],
        },
        {
          h2: "What Trackly collects — and what it never touches",
          ps: ["Being concrete is the best privacy policy. Here is exactly what is on each side of the line:"],
          table: {
            head: ["Trackly DOES", "Trackly NEVER does"],
            rows: [
              ["Stores the entries you type or say (expenses, habits, tasks, notes, lists)", "Read your bank SMS or any other messages"],
              ["Keeps your account email and auth credentials", "Scan your contacts, photos or files"],
              ["Syncs your entries, encrypted, to your private account", "Publish, share or sell your data to third parties"],
              ["Keep basic, aggregate usage needed to run the service", "Show ads or run ad trackers inside the app"],
              ["Answer privacy emails within 24 hours", "Lock your data in — export and deletion are one tap away"],
            ],
          },
          callout:
            "The AI assistant only reads the data you have already logged in Trackly, in your own account, to answer questions like \"aaj kharcha kitna hua?\" It is not trained on your data and your entries are not used to build anyone else's model.",
        },
        {
          h2: "Where your data lives",
          ps: [
            "Trackly is **offline-first** by architecture: every entry is saved on your device the moment you make it, which is why the app keeps working in airplane mode. When your device is online, entries sync to your private account so they survive a lost phone and appear on your other devices. Sync traffic is encrypted, and accounts are private by default — nothing you log is ever visible to other users.",
            "If you delete your account, deletion is permanent: your entries are removed from the server, not hidden in an archive. And because the app keeps a local copy while you use it, you always start with a full export if you want one before leaving.",
          ],
        },
        {
          h2: "Your rights: export and delete",
          ul: [
            "**Full export, anytime** — download everything you have logged as CSV/JSON from Settings. Your data is not a hostage.",
            "**Permanent deletion** — delete your account and your data goes with it, for real.",
            "**Privacy answers, fast** — privacy concerns and data requests are acknowledged within 24 hours and resolved within 30 days (DPDP Act 2023, Rule 11).",
            "**No lock-in** — no app store account, no subscription trap, no export paywall. You can leave whenever you want, with your data.",
          ],
        },
        {
          h2: "Compliance & who to contact",
          ps: [
            "Trackly is made by **ahexa.studio** (Purnea, Bihar, India). The service is designed to align with the Indian **DPDP Act 2023**, **GDPR** (Europe), **CCPA** (California) and the **IT Act 2000** — the same standards the in-app Privacy & Legal document follows, mirrored here so it is publicly readable.",
          ],
          table: {
            head: ["Contact / Fact", "Detail"],
            rows: [
              ["Maker", "ahexa.studio — [about page](/about)"],
              ["Support & privacy email", "amanatalibaisi786@gmail.com"],
              ["Grievance response", "Acknowledged in 24 hours, resolved within 30 days"],
              ["Compliance frameworks", "DPDP Act 2023 · GDPR · CCPA · IT Act 2000"],
              ["Governing law", "India"],
            ],
          },
        },
      ]}
      faqs={[
        {
          q: "Does Trackly read my bank SMS?",
          a: "No. Trackly never asks for SMS permission. You type or dictate expenses yourself (\"chai 20\") and the AI parses your words — no message scanning of any kind.",
        },
        {
          q: "Is Trackly safe to use?",
          a: "Yes. Trackly is private by default: no SMS reading, no contact scanning, no ads or ad trackers inside the app, encrypted sync to your private account, and one-tap export or permanent deletion of your data.",
        },
        {
          q: "Does Trackly sell my data?",
          a: "No — never. Trackly shows no ads inside the app, runs no ad SDKs, and does not share or sell user data to third parties. There is no business model that trades your data.",
        },
        {
          q: "Can I export or delete my Trackly data?",
          a: "Yes, anytime. Settings has a full CSV/JSON export of everything you have logged, and permanent account deletion that actually deletes your data from the server.",
        },
        {
          q: "Who do I contact about privacy?",
          a: "Email amanatalibaisi786@gmail.com. Trackly is made by ahexa.studio (Purnea, Bihar, India); privacy requests are acknowledged within 24 hours and resolved within 30 days under the DPDP Act 2023.",
        },
      ]}
      siblingLinks={[
        { href: "/", label: "Home — all features" },
        { href: "/features", label: "Complete feature list" },
        { href: "/about", label: "About — who built Trackly" },
        { href: "/expense-tracker", label: "Expense tracker" },
        { href: "/money-tracker", label: "Money tracker" },
        { href: "/install", label: "Install the app" },
        { href: "/blog", label: "Blog" },
      ]}
    />
  );
}
