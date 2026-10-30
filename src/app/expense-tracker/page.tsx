import type { Metadata } from "next";
import KeywordPage from "@/components/seo/KeywordPage";

// Programmatic SEO page targeting: "expense tracker", "expense tracker app",
// "free expense tracker", "daily expense tracker", "expense tracker india".
// Exact-match slug + H1 + title, answer-first lead (AEO), FAQ schema.

const TITLE = "Free Expense Tracker App — 5-Second Entry, Offline, No Ads";
const DESCRIPTION =
  "Trackly is a free expense tracker app: log any spend in ~5 seconds by typing or talking, set monthly budgets, see category-wise reports, track udhaar — offline-first, no bank-SMS access, no sign-up wall.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "expense tracker",
    "expense tracker app",
    "free expense tracker",
    "daily expense tracker",
    "expense tracker india",
    "kharcha tracker",
  ],
  alternates: {
    canonical: "/expense-tracker",
    languages: { "en-IN": "/expense-tracker", en: "/expense-tracker", "x-default": "/expense-tracker" },
  },
  openGraph: {
    type: "website",
    url: "https://trackly.today/expense-tracker",
    siteName: "Trackly",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trackly — Free Expense Tracker App" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

export default function ExpenseTrackerPage() {
  return (
    <KeywordPage
      eyebrow="Free · Offline-first · No sign-up wall"
      h1="Free Expense Tracker That Takes 5 Seconds Per Entry"
      sub={
        "Trackly is a free expense tracker app that logs any spend in about five seconds — type \"chai 20\" in Quick Add, or just tell the built-in AI \"momo 70 rupaye kharcha hua\". It works fully offline, syncs when you are back online, never reads your bank SMS, and turns your entries into daily, weekly and monthly reports with category breakdowns and budgets."
      }
      chips={[
        "₹0 — core features free",
        "Works with no network",
        "AI entry in English or Hinglish",
        "iOS & Android (PWA)",
        "No bank-SMS access",
        "Export CSV / JSON anytime",
      ]}
      canonical="/expense-tracker"
      description={DESCRIPTION}
      sections={[
        {
          h2: "Why most expense trackers get abandoned by week three",
          ps: [
            "Almost nobody quits expense tracking because they stopped caring about their money. They quit because logging one ₹40 chai took eleven taps, a category scroll and a date picker — and the friction quietly won. Research on habit formation keeps finding the same bar: if a daily action takes much more than ten seconds, most people drop it within two or three weeks.",
            "UPI made this worse, not better. When money leaves in two taps without ever passing through your hands, the small repeated spends — ₹50–₹200 a day — are exactly the ones you forget. That leak is where an expense tracker earns its place, which is why [Trackly](/) is built entry-speed-first: everything else in this page is downstream of \"how fast can I write down what I just spent?\".",
          ],
          callout:
            "The best expense tracker is the one you will still be using in week three. Features you abandon are worth exactly zero.",
        },
        {
          h2: "Two ways to log a spend — both under five seconds",
          h3: "Quick Add: type it like you would text it",
          ps: [
            "Open the app, tap the + button, type \"petrol 500\" — Trackly parses the amount, guesses the category, and saves. No forms, no wheels, no required fields. A note is optional; the date is always today unless you say otherwise.",
          ],
        },
        {
          h3: "AI assistant: just talk to it — English or Hinglish",
          ps: [
            "Every account includes an AI assistant that adds expenses from plain sentences: \"add momo 70, biryani 78, cold coffee 45\" creates three entries at once. It answers questions from your real data too — \"aaj kitna kharcha hua?\" gets you today's actual total, not a guess. It replies in the language you used, so Hinglish input gets a Hinglish reply.",
          ],
          table: {
            head: ["You type or say", "Trackly does", "Time"],
            rows: [
              ["\"chai 20\"", "Expense saved, category guessed", "~3 sec"],
              ["\"add momo 70, biryani 78\"", "Two expenses at once", "~4 sec"],
              ["\"aaj kitna kharcha hua?\"", "Answers from today's real data", "~3 sec"],
              ["\"kal gym jaana hai yaad dila dena\"", "Task added for tomorrow", "~4 sec"],
            ],
          },
        },
        {
          h2: "Offline-first: your data does not depend on a network bar",
          ps: [
            "Trackly is a PWA (Progressive Web App), and it takes offline seriously: expenses you add with no network are stored locally and sync to the cloud the moment you are back online. On a metro ride, in a basement classroom, on a highway in Rohtak — the entry takes the same five seconds. Cloud sync with your free account means your data follows you when you switch phones.",
          ],
          ul: [
            "Entries work with zero network — sync happens automatically later",
            "Free account keeps data synced across devices",
            "Export everything to CSV or JSON whenever you want — your data is yours",
          ],
        },
        {
          h2: "Budgets and reports that show the leak, not just the total",
          ps: [
            "Seeing \"you spent ₹12,400 this month\" is mildly interesting. Seeing that ₹3,100 of it was food-delivery is what actually changes behaviour. Trackly's reports break spending down by day, week, month and year, with per-category totals, and a monthly budget turns the category view into an early warning instead of a post-mortem.",
            "The borrow/lend ledger completes the picture: money you lent to Rohit and money you still owe from last month's trip are tracked separately from expenses, with due dates — so \"kisko paise dene hain?\" has a real answer.",
          ],
        },
        {
          h2: "Beyond solo tracking: shopping lists and group expenses",
          ps: [
            "Real spending does not happen in one neat personal lane. Trackly keeps a shopping list where marking an item purchased records it as spend — with a return-window reminder — and a full group-split engine for flatmates and trips: add a ₹6,000 hotel bill, split it equally, and everyone's balance updates live with settle-up suggestions. No spreadsheet at the end of the trip.",
          ],
          ul: [
            "Shopping list → \"mark purchased\" → automatically tracked as spend + return window",
            "Groups: equal or custom splits, live balances, settle-up suggestions, repayment history",
            "Student mode and office mode add fee/attendance/salary surfaces on the same data",
          ],
        },
        {
          h2: "Privacy: an expense tracker that does not read your SMS",
          ps: [
            "Automatic SMS-reading trackers are genuinely convenient — and they need full access to your messages, OTPs included, to work. Trackly takes the other road by design: nothing is read automatically, everything is entered by you (typed or spoken), so the app needs zero access to your financial messages. If automation is your top priority, an SMS-reading app is the honest pick — but it is a trade-off you should make consciously.",
          ],
        },
        {
          h2: "How to start in about 30 seconds",
          ol: [
            "Open [trackly.today](https://trackly.today) in Safari (iPhone) or Chrome (Android) — no app store needed.",
            "Tap Share → Add to Home Screen (iPhone) or the Install prompt (Android). It installs like a real app, works offline.",
            "Type \"chai 20\" in Quick Add. Congratulations — you are expense tracking.",
          ],
          ps: [
            "A free account (email or Google) unlocks cloud sync across devices. Everything in this page works on the free tier; there is no trial countdown.",
          ],
        },
        {
          h2: "Trackly vs the common alternatives",
          table: {
            head: ["", "Trackly", "SMS-reading apps", "Spreadsheets"],
            rows: [
              ["Entry effort", "~5 sec, typed or spoken", "Zero (automatic)", "High — every cell by hand"],
              ["Privacy", "No SMS access at all", "Reads all messages", "Fully yours"],
              ["Offline", "Yes, offline-first", "Partial", "Yes (local file)"],
              ["Budgets + reports", "Built-in, visual", "Built-in", "You build them"],
              ["Also tracks", "Habits, tasks, notes, udhaar, groups", "Expenses only", "Whatever you build"],
            ],
          },
          ps: [
            "Want the longer, more detailed version of this comparison? Read [Best Free Expense Tracker Apps in India](/blog/best-free-expense-tracker-apps-india).",
          ],
        },
      ]}
      faqs={[
        {
          q: "Is Trackly really free to use as an expense tracker?",
          a: "Yes. Expense tracking, budgets, reports, offline mode, shopping lists, borrow/lend and group splitting are all free on the core tier. There is no trial countdown and no ads inside the app. An AI usage limit applies on the free tier (30 messages per day), which exists to keep the free tier sustainable — manual Quick Add entry is unlimited.",
        },
        {
          q: "Does the expense tracker work without internet?",
          a: "Yes — Trackly is offline-first. Expenses added with no network are stored on your device and sync to your account automatically once you are back online. The app itself installs to your home screen from the browser (Safari or Chrome), so it opens like a native app with or without a connection.",
        },
        {
          q: "Is my financial data safe in Trackly?",
          a: "Trackly never reads your bank SMS, contacts or transactions — every entry is made by you, typed or spoken. Data is synced to your own account over HTTPS and is not sold or shared; you can export or delete everything from Settings at any time. The privacy-first trade-off is that nothing is automatic: what gets tracked is what you enter.",
        },
        {
          q: "Can I track expenses in Hinglish or Hindi?",
          a: "Yes. The built-in AI assistant understands Roman-script Hinglish natively — \"momo 70 rupaye kharcha hua, add kar do\" creates the expense and replies in the same Hinglish register. It also handles plain English; the reply language matches each message automatically.",
        },
        {
          q: "Can I export my expense data?",
          a: "Yes — Settings → Export Data gives you CSV and JSON downloads of everything you have entered. Your data is never locked in, and you can delete your account (and all synced data) from the app at any time.",
        },
      ]}
      siblingLinks={[
        { href: "/features", label: "All 40+ Trackly features" },
        { href: "/habit-tracker", label: "Free Habit Tracker" },
        { href: "/money-tracker", label: "Money Tracker — Kharcha & Udhaar" },
        { href: "/install", label: "Install Trackly" },
        { href: "/blog/best-free-expense-tracker-apps-india", label: "Best Expense Tracker Apps in India" },
        { href: "/blog/how-to-split-trip-expenses-with-friends", label: "Split Trip Expenses the Easy Way" },
      ]}
    />
  );
}
