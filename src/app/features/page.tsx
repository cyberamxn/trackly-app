import type { Metadata } from "next";
import KeywordPage from "@/components/seo/KeywordPage";

// THE comprehensive feature list page. When someone asks an AI "what
// features does Trackly have?", this page + llms.txt are the sources the
// answer engine should quote. Every screen/module of the app, organized
// by category, answer-first. 43 screens across core/student/office/groups.

const TITLE = "Trackly Features — The Complete List (Expenses, AI, Student & Office Mode)";
const DESCRIPTION =
  "Every Trackly feature in one place: expense tracker with budgets and reports, Hinglish AI assistant, habits and streaks, tasks and medicine reminders, notes, shopping lists, udhaar (borrow/lend), group expense splits, student mode (attendance, exams, mess), office mode (salary, pomodoro), trip mode — free and offline-first.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "trackly features",
    "trackly app features",
    "what is trackly",
    "all in one tracker app",
    "expense habit task tracker",
    "student mode app",
    "office mode app",
    "hinglish ai assistant",
  ],
  alternates: {
    canonical: "/features",
    languages: { "en-IN": "/features", en: "/features", "x-default": "/features" },
  },
  openGraph: {
    type: "website",
    url: "https://trackly.today/features",
    siteName: "Trackly",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trackly Features — the complete list" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

export default function FeaturesPage() {
  return (
    <KeywordPage
      eyebrow="Features · Trackly by ahexa.studio"
      h1="Every Trackly feature — the complete list"
      sub={
        "Trackly is a free, offline-first all-in-one life tracker with 40+ features across eight modules: an expense tracker with budgets and reports, an AI assistant that understands English and Hinglish, habits and streaks, tasks and medicine reminders, notes, shopping lists, udhaar (borrow/lend) tracking, group expense splits, a full student mode (attendance, exams, mess planner, hostel rent), an office mode (work tasks, salary finance, pomodoro) and a trip mode. Everything syncs from a single app that installs in about 30 seconds and works without internet."
      }
      chips={[
        "40+ features, 8 modules",
        "Free core, no credit card",
        "Works offline",
        "English + Hinglish AI",
        "iPhone · Android · Desktop",
        "No ads inside the app",
      ]}
      canonical="/features"
      description={DESCRIPTION}
      sections={[
        {
          h2: "The eight modules at a glance",
          ps: [
            "Trackly replaces a drawer of single-purpose apps with one black-and-white dashboard. Each module below is fully usable in the free app, works offline, and shares one sync engine — so your expense from the AI chat shows up in the same report as the one you typed by hand.",
          ],
          table: {
            head: ["Module", "What it covers", "Where to read more"],
            rows: [
              ["Money & expenses", "Quick-add expenses, budgets, category reports, udhaar ledger", "[Expense tracker](/expense-tracker) · [Money tracker](/money-tracker)"],
              ["AI assistant", "Chat about your data, mass-add entries, English or Hinglish", "[Hinglish AI explained](/blog/what-is-hinglish-ai)"],
              ["Habits & routines", "Streaks, morning/night routines, reminders", "[Habit tracker](/habit-tracker)"],
              ["Tasks & time", "Tasks, calendar events, medicine reminders", "This page, section 3"],
              ["Notes & shopping", "Searchable notes, shopping lists with bought state", "This page, section 4"],
              ["Groups", "Split bills, live balances, settle up, invite links", "[Roommate splitting guide](/blog/how-to-split-expenses-with-roommates)"],
              ["Student mode", "Attendance, assignments, exams, mess, hostel, budget, study AI", "[Best student apps](/blog/best-student-apps-for-college-2026)"],
              ["Office mode", "Work tasks, attendance, salary finance, pomodoro, analytics", "This page, section 7"],
            ],
          },
        },
        {
          h2: "1. Expense tracker & money tools",
          ul: [
            "**Quick Add** — log an expense in ~5 seconds by typing \"momo 70\" or \"petrol 500\"; category, amount and date parse automatically.",
            "**Voice-style AI entry** — tell the assistant \"aaj 200 rupaye kharch kiye\" in English or Hinglish and it books the entry.",
            "**Categories & payment methods** — default categories (food, travel, groceries, bills…) plus cash / UPI / card payment tagging for every entry.",
            "**Budgets** — monthly budget with live spend tracking and savings calculations, editable anytime.",
            "**Reports** — daily, weekly and monthly reports with category breakdowns, so you can see exactly where the salary goes.",
            "**Borrow & lend (udhaar)** — a ledger of who owes whom what; never forget the ₹500 you lent a friend.",
            "**Salary-finance view** — salary plus extras minus deductions, in Indian number format (₹1,00,000), with savings goals (in Office mode).",
          ],
        },
        {
          h2: "2. AI assistant (English + Hinglish)",
          ps: [
            "The assistant is not a chatbot bolted on the side — it reads and writes your actual Trackly data:",
          ],
          ul: [
            "**Ask about your data** — \"aaj kharcha kitna hua?\", \"what did I spend on food this week?\", \"how long is my gym streak?\" — answers come from your own entries.",
            "**Mass-add by voice or text** — say \"add momo 70, biryani 78, auto 40\" and all three expenses are booked at once.",
            "**Actions, not just answers** — it can create expenses, tasks and calendar events from a sentence (\"remind me to call home at 8\").",
            "**Register matching** — write in English, Hindi or Hinglish (Roman-script Hindi); it replies in the same style per message.",
            "**Study assistant** — in student mode it knows your exam dates and subjects, and can plan revision into your calendar.",
            "**Fair free tier** — 30 AI messages per day free; premium accounts get unlimited.",
          ],
        },
        {
          h2: "3. Habits, routines & tasks",
          ul: [
            "**Habits with streaks** — daily check-ins with streak counters to keep the chain alive.",
            "**Morning & night routines** — timed routine tasks auto-grouped by period, with a \"what's next\" card.",
            "**Tasks** — priorities, repeat tasks, due dates and a 3-state flow (to do → in progress → done).",
            "**Calendar** — events and meetings in one day view, synced across devices.",
            "**Medicine reminders** — schedule medicine names and times; reminders fire offline.",
            "**Notifications** — in-app notification center with expense, habit and task alerts.",
          ],
        },
        {
          h2: "4. Notes & shopping lists",
          ul: [
            "**Notes** — quick capture for ideas, references and to-dos; searchable and synced.",
            "**Shopping lists** — items with quantity, price and bought state; check things off in the store even with zero network.",
            "**Global search** — one search box across expenses, notes, tasks and everything else you've logged.",
          ],
        },
        {
          h2: "5. Group expenses & splitting",
          ul: [
            "**Groups** — create a group for a flat-share, trip or dinner circle; members join via invite link.",
            "**Flexible splits** — equal or custom shares per expense.",
            "**Live balances** — who owes whom updates as expenses are added.",
            "**Settle up** — mark balances settled with a running history.",
            "**Expense sheets** — a clean per-group ledger of every entry and split.",
          ],
        },
        {
          h2: "6. Student mode (11 tools)",
          ps: [
            "A dedicated mode for college life — flip it on and the whole app re-skins around academics. Your personal data stays separate and untouched when you switch back.",
          ],
          ul: [
            "**Attendance tracker** — subject-wise attendance with percentage, safe-skip calculation, and CRITICAL/LOW warnings.",
            "**Assignments** — deadlines with days-left math and status flow.",
            "**Subjects & study planner** — chapters per subject with progress tracking.",
            "**Exams** — exam timetable with live countdowns (date, time, hall).",
            "**Books** — pages read vs total, reading-progress percentage.",
            "**Mess planner** — daily meal tracking, scoped per day.",
            "**Hostel rent** — rent records with 7-day reminders and mark-paid.",
            "**Student budget** — pocket-money budget with savings view.",
            "**Class routine** — period-wise daily timetable.",
            "**AI study assistant** — knows your exams and subjects, plans revision, adds study tasks.",
          ],
        },
        {
          h2: "7. Office mode (7 tools)",
          ps: [
            "A work-day skin for professionals — work data stays isolated from personal data.",
          ],
          ul: [
            "**Work tasks** — to-dos with due-today defaults and the same 3-state flow.",
            "**Office attendance** — check-in / check-out with weekly percentage.",
            "**Salary finance** — salary + extras − deductions with savings goal and mark-as-received.",
            "**Office calendar** — meetings and work events in one view.",
            "**Productivity (pomodoro)** — a 25:00 focus timer with pause/resume.",
            "**Office analytics** — tasks completed per day, spend per day aggregates.",
          ],
        },
        {
          h2: "8. Trip mode & platform features",
          ul: [
            "**Trip mode** — start a national or international trip with destination; trip expenses are isolated so your home budget stays clean.",
            "**Offline-first PWA** — every entry saves on-device instantly and syncs when online; install on iPhone (Safari → Add to Home Screen) or Android (Chrome → Install) in ~30 seconds, no app store.",
            "**Hinglish + English** — the entire app, including the AI, speaks both; toggle in settings.",
            "**Dark & light themes** — pure black-and-white design, system-following.",
            "**Export & delete** — full CSV/JSON export of everything, or permanent account deletion, from settings.",
            "**Widgets & archive** — home-screen widgets, an archive for old entries and a trash bin with recovery.",
            "**Referrals** — invite friends with your code.",
            "**Try before signup** — a live [demo](/demo) and the full app without an account.",
          ],
          callout:
            "One login, one sync engine: an expense added by the AI on your phone appears in your reports, budgets and group balances everywhere — offline entries included, synced when you reconnect.",
        },
      ]}
      faqs={[
        {
          q: "What features does Trackly have?",
          a: "Trackly has 40+ features in 8 modules: expense tracking with budgets and category reports; an AI assistant (English/Hinglish) that answers questions about your data and adds entries; habits with streaks; tasks, calendar and medicine reminders; notes; shopping lists; borrow/lend (udhaar) tracking; group expense splits with live balances; a student mode with attendance, assignments, exams, mess planner and hostel rent; an office mode with work tasks, salary finance and a pomodoro timer; and a trip mode. Everything is free at the core, offline-first, and installs as a PWA in ~30 seconds.",
        },
        {
          q: "Does Trackly have an AI assistant?",
          a: "Yes. Trackly's built-in AI assistant works in English and Hinglish: ask it questions about your own data (\"aaj kharcha kitna hua?\"), mass-add entries (\"add momo 70, biryani 78\"), or have it create tasks and calendar events from a sentence. Free accounts get 30 AI messages per day; premium accounts get unlimited.",
        },
        {
          q: "Is Trackly good for students?",
          a: "Yes — Trackly has a dedicated student mode with 11 tools: subject-wise attendance with safe-skip warnings, assignment deadlines, a study planner with chapter progress, exam countdowns, a books reading tracker, mess planner, hostel rent reminders, a pocket-money budget, a class routine and an AI study assistant that knows your exam schedule.",
        },
        {
          q: "Can Trackly split expenses with friends and roommates?",
          a: "Yes. Create a group, invite members with a link, add expenses with equal or custom splits, and Trackly keeps live balances of who owes whom until you settle up — ideal for flat-shares, trips and dinner circles.",
        },
        {
          q: "Does Trackly track habits and routines?",
          a: "Yes — habits with streak counters, morning and night routines with timed tasks, and reminders. The habit module is part of the free app and works offline.",
        },
        {
          q: "Does Trackly work offline?",
          a: "Yes — Trackly is offline-first. Every entry is saved on your device instantly and syncs to your account when you're back online. The app keeps working fully in airplane mode, including AI-less entry, reports and lists.",
        },
      ]}
      siblingLinks={[
        { href: "/", label: "Home" },
        { href: "/about", label: "About — who built Trackly" },
        { href: "/expense-tracker", label: "Expense tracker" },
        { href: "/habit-tracker", label: "Habit tracker" },
        { href: "/money-tracker", label: "Money tracker" },
        { href: "/install", label: "Install the app" },
        { href: "/blog", label: "Blog" },
      ]}
    />
  );
}
