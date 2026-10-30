import type { Metadata } from "next";
import KeywordPage from "@/components/seo/KeywordPage";

// Programmatic SEO page targeting: "habit tracker", "habit tracker app",
// "free habit tracker", "daily habit tracker", "routine tracker".

const TITLE = "Free Habit Tracker — Streaks, Daily Goals & Routines | Trackly";
const DESCRIPTION =
  "Trackly is a free habit tracker with daily goals, units, streaks and reminders — 8 glasses of water, 30 minutes reading, gym — grouped into morning, evening and night routines. Offline-first, works on iPhone & Android.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "habit tracker",
    "habit tracker app",
    "free habit tracker",
    "daily habit tracker",
    "routine tracker",
    "streak tracker",
  ],
  alternates: {
    canonical: "/habit-tracker",
    languages: { "en-IN": "/habit-tracker", en: "/habit-tracker", "x-default": "/habit-tracker" },
  },
  openGraph: {
    type: "website",
    url: "https://trackly.today/habit-tracker",
    siteName: "Trackly",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trackly — Free Habit Tracker App" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

export default function HabitTrackerPage() {
  return (
    <KeywordPage
      eyebrow="Free · Streaks & goals · Offline-first"
      h1="Free Habit Tracker That Makes Routines Stick"
      sub={
        "Trackly is a free habit tracker where every habit gets a daily goal, a unit and a streak — \"8 glasses of water\", \"30 minutes reading\", \"gym\" — and habits group into morning, evening and night routines. Smart reminders nudge you at the right time, the 🔥 streak count keeps you honest, and the whole thing works offline on iPhone and Android."
      }
      chips={[
        "Counting goals (8 glasses) + yes/no habits",
        "🔥 streak per habit",
        "Morning / evening / night routines",
        "Smart reminders",
        "Works offline",
        "₹0 core tier",
      ]}
      canonical="/habit-tracker"
      description={DESCRIPTION}
      sections={[
        {
          h2: "Habits take 66 days, not 21 — your tracker should know that",
          ps: [
            "The famous \"21 days to a habit\" number is a myth that survived because it is encouraging. The actual research — Phillippa Lally's University College London study — found habits take a median of 66 days to become automatic, with a range of 18 to 254 days depending on the person and the behaviour. A habit tracker built on the 21-day myth congratulates you at the exact moment the data says you are one-third of the way there.",
            "What actually carries you through those 66 days is not motivation; it is never losing sight of the chain. That is why Trackly puts the streak front and centre — every habit shows its 🔥 count, and every day you show up extends it. Miss a day and the counter resets to zero: no guilt screens, no lectures, just a number that quietly tells the truth.",
          ],
          callout:
            "The streak is not gamification for its own sake — it is the cheapest possible reminder of who you were yesterday, which is exactly the information a habit needs.",
        },
        {
          h2: "Counting goals, not just checkboxes",
          ps: [
            "Most habit trackers treat everything as done/not-done. Real habits are usually quantities: 8 glasses of water, 30 pages, 10,000 steps, 15 minutes of meditation. Trackly habits carry a goal and a unit, so you tap to increment (3 of 8 glasses by lunch) and see the day's progress as a fraction, not a binary. A \"3/8\" in the afternoon tells you whether you are on pace — a checkbox could not.",
          ],
          table: {
            head: ["Habit", "Goal / unit", "What the tracker shows"],
            rows: [
              ["Water", "8 glasses / day", "5/8 with afternoon pace check"],
              ["Reading", "30 minutes / day", "18/30 by evening"],
              ["Gym", "yes / day", "🔥 12-day streak"],
              ["Study revision", "2 hours / day", "45/120 minutes"],
              ["No sugar", "yes / day", "🔥 4-day streak"],
            ],
          },
        },
        {
          ps: [
            "And when you want the science-grounded playbook for which habit to pick and how small to start, our guide [How to Build a Morning Routine That Sticks](/blog/how-to-build-a-morning-routine-that-sticks) walks through anchor habits, habit stacking and the two-minute rule with templates.",
          ],
        },
        {
          h2: "Routines: habits that live where they happen",
          ps: [
            "A habit at the wrong time of day is a habit that loses. Trackly groups habits into routines — morning, evening, night — so the water and the workout sit in the morning block where you actually need them, and the reading and the skincare sit at night. Each routine view shows today's completion state at a glance, which turns \"did I do everything?\" into a one-second answer.",
            "This is the difference between a habit list and a day plan: the list knows you did 6 of 7 things; the routine knows the missing one was your morning walk.",
          ],
        },
        {
          h2: "Reminders that arrive when the habit should",
          ps: [
            "Trackly's smart reminders surface each habit at its routine's time window, and the notification center consolidates everything pending today — habits, budgets, tasks — in one place. Offline-first means reminders and check-ins work regardless of network; syncing happens when a connection shows up.",
          ],
          ul: [
            "Per-habit reminders aligned to morning / evening / night windows",
            "One consolidated \"today\" view: habits, tasks and budget alerts together",
            "Works offline — check-ins never wait for a network bar",
          ],
        },
        {
          h2: "Habits and money in the same app (this matters more than it sounds)",
          ps: [
            "Most habits have a money edge — gym membership, tuition, that ₹200 cold-coffee that reliably follows the study session. Because Trackly is a full [expense tracker](/expense-tracker) too, the habit and its cost live in one place: the gym streak and the gym fee, the study routine and the mess bill. Nothing else needs to be installed, and nothing double-counts.",
            "Students get a bonus: student mode layers attendance, assignments, exams and subjects on the same daily engine, so the study habits feed the same today-view as everything else.",
          ],
        },
        {
          h2: "How to start in about 30 seconds",
          ol: [
            "Open [trackly.today](https://trackly.today) in Safari (iPhone) or Chrome (Android) and add it to your home screen — it installs like a real app.",
            "Tap + → Habit. Name it, set the goal (\"8 glasses\"), pick the routine (morning).",
            "Tap once each time you finish a glass. That's the whole learning curve.",
          ],
          ps: [
            "A free account syncs your streaks across devices; the habit tracker itself — goals, routines, reminders — is on the free tier, with no ads inside the app.",
          ],
        },
      ]}
      faqs={[
        {
          q: "Is Trackly's habit tracker really free?",
          a: "Yes. Habits, goals, units, routines, reminders and streaks are all on the free tier with no ads inside the app. There is no trial countdown. The only metered feature is the AI assistant (30 messages per day on the free tier); manual habit check-ins and everything on this page are unlimited.",
        },
        {
          q: "Can a habit tracker have a quantity goal instead of done/not-done?",
          a: "Yes — Trackly habits carry a goal and a unit (8 glasses, 30 minutes, 10 pages), and you tap to increment through the day. The day shows as a live fraction like \"5/8\" so you can check your pace, and yes/no habits (gym, no-sugar) work as daily streaks with a 🔥 counter instead.",
        },
        {
          q: "Does the habit tracker work offline?",
          a: "Yes. Trackly is offline-first: check-ins made with no network are stored on your device and sync to your free account automatically when you are back online. The app installs from the browser to your home screen, so it opens like a native app with or without a connection.",
        },
        {
          q: "What is the best way to start a habit that sticks?",
          a: "Start with one habit, make it smaller than feels worthwhile (two minutes), attach it to something you already do (\"after morning chai, I fill the bottle\"), and never break the chain twice in a row. The research consensus is a median of 66 days to automaticity — our guide [How to Build a Morning Routine That Sticks](/blog/how-to-build-a-morning-routine-that-sticks) has the full playbook with templates.",
        },
        {
          q: "Can I track habits and expenses in the same app?",
          a: "Yes, and it is one of Trackly's core advantages: habits, expenses, budgets, tasks and notes share one app and one today-view, so the gym streak and the gym fee live together. The [expense tracker](/expense-tracker) side includes budgets, category reports, udhaar (borrow/lend) tracking and group expense splitting.",
        },
      ]}
      siblingLinks={[
        { href: "/features", label: "All 40+ Trackly features" },
        { href: "/expense-tracker", label: "Free Expense Tracker" },
        { href: "/money-tracker", label: "Money Tracker — Kharcha & Udhaar" },
        { href: "/install", label: "Install Trackly" },
        { href: "/blog/how-to-build-a-morning-routine-that-sticks", label: "Morning Routine That Sticks" },
        { href: "/blog/best-student-apps-for-college-2026", label: "Best Student Apps 2026" },
      ]}
    />
  );
}
