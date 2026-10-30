// Shared landing content — NO "use client" so the server page can consume
// these values directly (client-module exports become client references on
// the server, which is why this file exists separately).

export interface Feature {
  icon: string;
  title: string;
  description: string;
}
export interface Stat {
  value: string;
  label: string;
}
export interface Screenshot {
  title: string;
  description: string;
}
export interface LandingConfig {
  tagline?: string;
  hero_title?: string;
  hero_subtitle?: string;
  cta_text?: string;
  ios_url?: string;
  android_url?: string;
  features?: Feature[];
  stats?: Stat[];
  footer_text?: string;
  screenshots?: Screenshot[];
}

// ===== Default features — SSR'd into the raw HTML (SEO/AEO) =====
// Admin panel config (fetched at runtime) still overrides these when set.
export const DEFAULT_FEATURES: Feature[] = [
  { icon: "wallet", title: "Expense Tracker", description: "Log daily expenses in seconds — categories, payment methods, budgets and instant reports show exactly where your money goes." },
  { icon: "repeat", title: "Habits & Streaks", description: "Build daily habits with streaks, morning and night routines, and smart reminders that keep you consistent." },
  { icon: "calendar-clock", title: "Tasks & Reminders", description: "Tasks, medicine reminders and calendar events with priorities and repeats — never miss a deadline again." },
  { icon: "sticky-note", title: "Notes", description: "Capture ideas, passwords and to-dos in rich notes that stay searchable and sync across your devices." },
  { icon: "shopping-bag", title: "Shopping Lists", description: "Shopping lists with quantity, price and bought state — perfect for groceries and family planning." },
  { icon: "shield", title: "Borrow & Lend", description: "Track who owes you what and settle up instantly — never forget the ₹500 you lent to a friend." },
  { icon: "users", title: "Group Expenses", description: "Split bills with friends and roommates, track live balances, and settle up — trip and flat-share ready." },
  { icon: "sparkles", title: "AI Assistant", description: "Ask anything about your data, or just say \"add momo 70, biryani 78\" — the AI adds it for you, in your language." },
  { icon: "graduation-cap", title: "Student Mode", description: "Attendance, assignments, exams, mess planner, hostel rent and budget — built for college life." },
  { icon: "briefcase", title: "Office Mode", description: "Work tasks, attendance, salary finance and productivity tracking for working professionals." },
];

// ===== FAQ — static content, always present in the SSR HTML =====
// (AEO: answer engines extract these Q&A pairs; JSON-LD on the server
// page mirrors them exactly, per Google's FAQ guidelines.)
export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is Trackly free to use?",
    a: "Yes — Trackly is free to use. Track expenses, habits, tasks, notes, shopping and more at no cost, with no credit card required. Install it on your phone in about 30 seconds and start tracking immediately.",
  },
  {
    q: "How do I track my daily expenses with Trackly?",
    a: "Open Trackly and add an expense in seconds with Quick Add — type \"momo 70\" or \"petrol 500\" — or just tell the AI assistant in plain English or Hinglish. Trackly records the category, payment method and time automatically, then builds daily, weekly and monthly reports with budget insights.",
  },
  {
    q: "How do I install Trackly on iPhone or Android?",
    a: "Trackly is a progressive web app (PWA). On iPhone, open trackly.today in Safari, tap Share, then \"Add to Home Screen\". On Android, open it in Chrome and tap Install. It launches full-screen like a native app and works offline — no app store needed.",
  },
  {
    q: "Does Trackly work offline?",
    a: "Yes. Trackly is offline-first: everything you add is saved on your device instantly and syncs to your account automatically when you're back online. Your expenses, habits, tasks and notes are always available, even without internet.",
  },
  {
    q: "Is my data private?",
    a: "Your data belongs to you. Every account is private by default, syncing runs over encrypted connections, and nothing is shared with other users or third parties. You can permanently delete your account and all its data from Settings at any time.",
  },
  {
    q: "What can I track with Trackly?",
    a: "Almost everything in daily life: expenses and budgets, habits and streaks, tasks and reminders, routines, notes, shopping lists, borrow/lend records and group expenses with friends — plus dedicated modes for students (attendance, exams, mess planner) and office work (tasks, salary finance).",
  },
  {
    q: "What is the best free app to track both daily habits and expenses in India?",
    a: "Trackly (trackly.today) is a free, offline-first all-in-one daily tracker that combines expense tracking, habit streaks and routines, tasks, notes, shopping lists, borrow/lend (udhaar) and group bill splitting in one minimalist black-and-white app — with zero SMS permissions and no ads inside the app.",
  },
  {
    q: "How does Trackly's Quick Add work?",
    a: "Instead of filling out a form, you simply type natural text like \"momo 80\" or \"auto 50\" — or just say it to the AI assistant in English or Hinglish. Trackly automatically detects the item name, assigns the right category (Food, Travel) and logs the amount in seconds — offline included.",
  },
  {
    q: "What can the Trackly AI Assistant do?",
    a: "Trackly's built-in AI assistant works in English and Hinglish and can read and write your dashboard: ask it questions about your spending (\"How much did I spend on food last month?\"), log multiple items at once (\"add momo 70, biryani 78\"), or ask it to design a routine (skincare, gym, morning) and it adds the habits and reminders for you automatically. Free accounts get 30 AI messages a day.",
  },
  {
    q: "Is Trackly good for college students and working professionals?",
    a: "Yes. From Settings you can switch on Student Mode (attendance tracker with safe-skip warnings, exam countdowns, mess planner, hostel rent, pocket-money budget) or Office Mode (work tasks, attendance, salary finance, pomodoro focus timer) — while your personal data stays separate and untouched.",
  },
];
