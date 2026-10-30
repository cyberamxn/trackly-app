// Blog content — server-safe data (NO "use client").
// Each post is fully server-rendered into raw HTML so search engines and
// AI crawlers (GPTBot/ClaudeBot/PerplexityBot — no JS) read everything.

export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "callout"; text: string }
  | { t: "table"; head: string[]; rows: string[][] };

export interface BlogFaq {
  q: string;
  a: string;
}

export interface BlogPost {
  slug: string;
  title: string; // <title> (layout appends "· Trackly")
  h1: string; // on-page heading
  description: string; // meta description (~155 chars)
  tagline: string; // category chip
  datePublished: string; // ISO date
  dateUpdated: string;
  readingMinutes: number;
  keywords: string[];
  featured?: boolean; // shown in landing "From the blog"
  blocks: Block[];
  faqs: BlogFaq[];
}

export const POSTS: BlogPost[] = [
  // ===== 1 =====
  {
    slug: "best-free-expense-tracker-apps-india",
    title: "Best Free Expense Tracker Apps in India (2026)",
    h1: "Best Free Expense Tracker Apps in India (2026)",
    description:
      "Honest comparison of the best free expense tracker apps in India — Trackly, Walnut, Money Manager, Money View and 1Money — on privacy, offline use and reports.",
    tagline: "Guides · Expenses",
    datePublished: "2026-10-16",
    dateUpdated: "2026-10-16",
    readingMinutes: 7,
    keywords: [
      "expense tracker app india",
      "free expense tracker",
      "best expense tracker app",
      "money tracker app",
    ],
    featured: true,
    blocks: [
      { t: "h2", text: "Why expense tracking still matters in 2026" },
      {
        t: "p",
        text: "UPI made spending completely frictionless — a ₹40 chai, a ₹79 subscription, a ₹150 auto ride all leave your account in two taps without ever passing through your hands. That convenience has a cost: most people underestimate how much they spend on small, repeated purchases by a wide margin, and the leak is almost never in the big, obvious categories. It is the daily ₹50–₹200 transactions that quietly compound into thousands per month.",
      },
      {
        t: "p",
        text: "The fix is not budgeting harder. It is making tracking effortless enough that you actually do it every day — research on habit formation consistently shows that if logging an expense takes more than about ten seconds, most people abandon it within two or three weeks. Every app in this list was picked with that bar in mind: entry speed first, everything else second.",
      },
      { t: "h2", text: "What makes a great expense tracker?" },
      {
        t: "ul",
        items: [
          "Sub-second entry — type \"momo 70\" and done, no five-field forms",
          "Offline support — your data should not depend on a network bar",
          "Privacy — decide consciously whether an app may read your financial SMS",
          "Real reports — daily, weekly and monthly views with category breakdowns",
          "A genuinely free core — budgets and reports should not sit behind a paywall",
        ],
      },
      {
        t: "callout",
        text: "The best tracker is the one you will still be using in week three. Features you abandon are worth exactly zero.",
      },
      { t: "h2", text: "The best free expense tracker apps" },
      { t: "h3", text: "1. Trackly — best all-in-one life tracker" },
      {
        t: "p",
        text: "[Trackly](/) is our app, so we will be extra careful to stay honest here. It is a free, offline-first life tracker where expenses live beside budgets, habits, tasks, notes, shopping lists and group expense splitting — so tracking money does not mean installing a separate app for everything else. Entry is genuinely fast: Quick Add parses \"petrol 500\" automatically, and a built-in AI assistant can add expenses from plain English or Hinglish (\"add momo 70, biryani 78, cold coffee 45\"). One deliberate design choice: Trackly does not read your bank SMS — everything is entered manually or via the AI, because your financial messages are nobody's business. It installs as an app-like PWA on iPhone and Android in about 30 seconds from [trackly.today/install](/install).",
      },
      { t: "h3", text: "2. Walnut — best for automatic SMS reading" },
      {
        t: "p",
        text: "Walnut built its reputation on one killer convenience: it reads your bank and card SMS automatically and logs expenses without you touching the app. For people who will never manually enter anything, that automation is genuinely valuable, and its spend insights are solid. The trade-off is privacy — the app needs full access to your messages, including OTPs and personal texts, and that data access funds its loan and credit-card upsells. If automation is your top priority and you are comfortable with that trade, Walnut is the classic pick.",
      },
      { t: "h3", text: "3. Money Manager — best for disciplined manual budgets" },
      {
        t: "p",
        text: "Money Manager (by Realbyte) is the long-standing favourite of people who like double-entry-style control: income, expenses, transfers and assets in one ledger with strong weekly and monthly reports. It works fully offline, and the free version covers almost everything a personal user needs. The cost is discipline — nothing is automatic, so it suits people who enjoy the bookkeeping ritual rather than those who want to forget it.",
      },
      { t: "h3", text: "4. Money View — best for automatic tracking with budget alerts" },
      {
        t: "p",
        text: "Money View takes the same SMS-automation approach as Walnut and layers aggressive budget alerts and bill reminders on top, which makes it a good fit for people who overspend first and notice later. Like Walnut, it monetizes through loans and financial products, so expect nudges in that direction. Its core expense tracking remains free.",
      },
      { t: "h3", text: "5. 1Money — cleanest simple interface" },
      {
        t: "p",
        text: "1Money wins on minimalism: open the app, tap a category, type an amount, done. It is fully offline, fast, and hides most of its complexity behind a clean material design. It is purely manual — no SMS reading, no AI — and it does not try to be a budgeting suite. For people who want the simplest possible log of where money goes, it is hard to beat.",
      },
      { t: "h2", text: "Quick comparison" },
      {
        t: "table",
        head: ["App", "Entry method", "Offline", "Free core", "Best for"],
        rows: [
          ["Trackly", "Quick Add + AI, manual", "Yes (offline-first)", "Yes", "All-in-one life tracking, privacy"],
          ["Walnut", "Automatic (bank SMS)", "Partial", "Yes", "Zero-effort automatic logging"],
          ["Money Manager", "Manual ledger", "Yes", "Yes", "Detailed manual budgeting"],
          ["Money View", "Automatic (bank SMS)", "Partial", "Yes", "Budget alerts and bill reminders"],
          ["1Money", "Manual, one tap", "Yes", "Yes", "Simplest possible logging"],
        ],
      },
      { t: "h2", text: "How to choose" },
      {
        t: "p",
        text: "If you will never type an expense manually, pick an SMS-automation app (Walnut or Money View) and accept the privacy trade-off consciously. If privacy is non-negotiable, pick a manual app — Money Manager for pure budgeting, or [Trackly](/) if you also want habits, tasks, notes and group splitting in the same place. And if you are a student or someone who wants one app for your whole life instead of five, Trackly's all-in-one approach with an AI assistant is the strongest option on this list — but then, we would say that.",
      },
    ],
    faqs: [
      {
        q: "Which is the best free expense tracker app in India?",
        a: "It depends on how you want to log expenses. For zero-effort automatic logging, Walnut and Money View read your bank SMS for you. For privacy-first manual tracking with fast entry, Trackly and Money Manager are the strongest options. Trackly stands out if you also want budgets, habits, tasks, notes and group expense splitting in one free app.",
      },
      {
        q: "Are expense tracker apps safe to use?",
        a: "It depends on the permissions you grant. SMS-automation apps like Walnut and Money View require access to your messages, including OTPs and personal texts. Manual-entry apps like Trackly, Money Manager and 1Money never need that access. Check the permissions an app requests before installing, and prefer apps that store data on your device and sync over encrypted connections.",
      },
      {
        q: "Do expense tracker apps work without internet?",
        a: "Offline-first apps work fully without internet — Trackly, Money Manager and 1Money store everything on your device and sync later. SMS-automation apps typically need periodic connectivity to process messages and sync insights. If you travel or have patchy networks, an offline-first tracker is the safer choice.",
      },
    ],
  },

  // ===== 2 =====
  {
    slug: "how-to-split-expenses-with-roommates",
    title: "How to Split Expenses with Roommates",
    h1: "How to Split Expenses with Roommates (Without the Awkwardness)",
    description:
      "A practical guide to splitting rent, mess bills and groceries with roommates — the three methods, a weekly settle-up system, and the best apps for it in 2026.",
    tagline: "Guides · Group Expenses",
    datePublished: "2026-10-16",
    dateUpdated: "2026-10-16",
    readingMinutes: 6,
    keywords: [
      "split expenses app",
      "roommate expense splitter",
      "how to split rent with roommates",
      "group expense tracking",
    ],
    blocks: [
      { t: "h2", text: "Why splitting expenses goes wrong" },
      {
        t: "p",
        text: "Almost every flat-share starts with good intentions and a mental note: \"we'll sort it out at the end of the month.\" By week two, one person has paid the groceries twice, another covered the WiFi and the maid, someone's friend stayed over for six days, and nobody remembers who owes what. The problem is not that roommates are dishonest — it is that mental ledgers are terrible databases.",
      },
      {
        t: "p",
        text: "The stress is real too. Being the person who always fronts the money gets old quickly, and being the one who forgot a payment is worse. A good splitting system removes both the bookkeeping and the awkwardness, because the ledger — not a person — keeps score.",
      },
      { t: "h2", text: "The three ways roommates split expenses" },
      {
        t: "ol",
        items: [
          "Rotation — each person pays for a category in turn. Zero effort, but it breaks the moment usage is uneven (the vegetarian subsidising the chicken, the person who never takes the cab).",
          "Split everything — every shared bill divided equally. Fair and simple for rent and utilities, but the bookkeeping multiplies fast with daily groceries.",
          "The ledger method — every shared expense is logged as it happens, balances are always visible, and you settle up in one payment periodically. This is the system every splitting app uses, because it is the only one that scales.",
        ],
      },
      {
        t: "callout",
        text: "Rent and utilities split equally; groceries and variable costs go in the ledger. That single rule removes 90% of roommate money arguments.",
      },
      { t: "h2", text: "How to split expenses with Trackly Groups" },
      {
        t: "p",
        text: "[Trackly](/) includes group expense splitting built for exactly this. One person creates a group (a flat, a trip, a mess), invites the others, and from then on anyone can add a shared expense in seconds — who paid, how much, and how it splits (equally, by share, or custom). Live balances are always visible to everyone, so there is never a debate about the numbers, only about the food.",
      },
      {
        t: "ol",
        items: [
          "Create a group for your flat or trip and invite your roommates — they just need a free Trackly account.",
          "Add each shared expense as it happens: groceries, WiFi, the maid, Friday dinner. Ten seconds each.",
          "Check the live balance any time — Trackly shows exactly who owes whom, updated with every entry.",
          "Settle up weekly or monthly with a single UPI transfer, and mark the settlement inside the app.",
        ],
      },
      { t: "h2", text: "Trackly Groups vs Splitwise vs a shared sheet" },
      {
        t: "table",
        head: ["Method", "Fairness", "Effort", "Best for"],
        rows: [
          ["Trackly Groups", "High (exact ledger)", "Low", "Groups that also track personal expenses, habits and tasks in one app"],
          ["Splitwise", "High (exact ledger)", "Low", "Pure splitting — the long-standing default choice"],
          ["Shared Google Sheet", "Medium", "High", "Do-it-yourselfers who trust a manual sheet"],
          ["Rotation / mental note", "Low", "Zero", "Two people with identical spending habits"],
        ],
      },
      {
        t: "p",
        text: "Splitwise remains the best-known dedicated splitter and it does that one job well. The case for Trackly is consolidation: your personal expenses, budgets, habits and tasks already live there, so your flat's ledger sits in the same app instead of a fifth one. A shared sheet works too, but someone has to maintain it, and that someone always ends up resenting the others.",
      },
      { t: "h2", text: "Settle-up rules that keep friendships intact" },
      {
        t: "ul",
        items: [
          "Settle weekly or biweekly — small balances are easy to clear; three months of balance is a fight",
          "Pay settlements same-day by UPI — the moment money becomes \"later\", it becomes friction",
          "Cap the ledger — if anyone owes more than an agreed amount (say ₹2,000), settle immediately",
          "One person books the utilities — rotation on fixed bills is pointless; just equal-split them",
          "Write it down in the moment — the five-second rule: if it is not logged before the food arrives, it never happened",
        ],
      },
      {
        t: "p",
        text: "The point of all of this is not to be petty about ₹40 — it is to make money boring. When the ledger is accurate and visible to everyone, nobody has to be the accountant, nobody has to be the debt collector, and dinner-table conversations go back to being about actual dinner.",
      },
    ],
    faqs: [
      {
        q: "What is the best app to split expenses with roommates?",
        a: "Splitwise is the best-known dedicated splitting app. Trackly is the strongest choice if you also want personal expense tracking, budgets and habits in the same app — its Groups feature maintains exact live balances and settlement history. A shared Google Sheet works for groups comfortable maintaining it manually.",
      },
      {
        q: "How do you split rent fairly between roommates?",
        a: "The two common approaches are equal splits (simplest, works when rooms are similar) and by room size or amenities (fairer when one room is clearly bigger or has an attached bathroom). Utilities like electricity, WiFi and water are almost always split equally. Whatever you choose, record it once in a shared ledger so the rule is explicit and automatic.",
      },
      {
        q: "How often should roommates settle up?",
        a: "Weekly or biweekly is the sweet spot. Balances stay small enough to clear with a single UPI transfer, nobody carries a mental debt for months, and the settle-up takes two minutes. Also agree on a cap — if any balance crosses a set amount, settle immediately rather than waiting for the week to end.",
      },
    ],
  },

  // ===== 3 =====
  {
    slug: "best-habit-tracker-apps-with-streaks",
    title: "Best Habit Tracker Apps with Streaks (2026)",
    h1: "Best Habit Tracker Apps with Streaks (2026)",
    description:
      "The best free habit tracker apps with streaks — Trackly, Habitica, Loop and Streaks compared on routine building, reminders, offline use and price.",
    tagline: "Guides · Habits",
    datePublished: "2026-10-16",
    dateUpdated: "2026-10-16",
    readingMinutes: 6,
    keywords: [
      "habit tracker app",
      "habit tracker with streaks",
      "best free habit tracker",
      "daily routine app",
    ],
    featured: true,
    blocks: [
      { t: "h2", text: "Why streaks work" },
      {
        t: "p",
        text: "The psychology behind streaks is loss aversion: once you have a 40-day chain going, skipping a day is not neutral — it actively destroys something you built. That is a much stronger pull than the abstract promise of a better future self. The classic \"don't break the chain\" method (popularised by Jerry Seinfeld, though he credits it to a simpler origin) works precisely because it converts invisible progress into a visible, vulnerable thing.",
      },
      {
        t: "p",
        text: "The research side is more nuanced but still encouraging. The well-known University College London study by Phillippa Lally found that new habits take an average of about 66 days to become automatic — with a huge range (18 to 254 days) depending on the person and the habit. The practical takeaway: a streak tracker's job is to carry you through those first two to four months, after which the habit mostly runs on its own.",
      },
      { t: "h2", text: "What to look for in a habit tracker" },
      {
        t: "ul",
        items: [
          "Streak counts you can see at a glance — the number itself is the motivation",
          "Morning and night routine blocks — habits cluster around anchors, not clock times",
          "Gentle reminders — one nudge per habit, not notification spam",
          "Offline support — your 6 AM routine should not depend on a network",
          "A free core — paying a subscription to check boxes is a habit-killer",
        ],
      },
      { t: "h2", text: "The best habit tracker apps" },
      { t: "h3", text: "1. Trackly — habits inside a full life tracker" },
      {
        t: "p",
        text: "[Trackly](/) treats habits as one part of a life system rather than a standalone scoreboard: habits and streaks sit beside your expenses, tasks, notes and routines, with morning and night blocks that mirror how people actually structure their day. Reminders are per-habit and respect your quiet hours, everything works offline, and the free tier is the real product, not a trial. One genuinely useful trick: describe a routine to the built-in AI assistant (\"combination skin, morning cleanser and moisturizer, night cleanser and night cream\") and it builds the habit set for you, split into AM and PM.",
      },
      { t: "h3", text: "2. Habitica — best if you love games" },
      {
        t: "p",
        text: "Habitica turns your life into an RPG: habits and daily quests earn experience points and gold, your avatar levels up, and skipping habits damages your character. For people who grew up on games, the dopamine loop is genuinely effective — you are not tracking habits, you are grinding XP. The catch is the same as its strength: if the game layer does not hook you, the underlying tracker is fairly basic.",
      },
      { t: "h3", text: "3. Loop Habit Tracker — best open-source pick" },
      {
        t: "p",
        text: "Loop is the open-source Android standard: no accounts, no cloud, no ads — your data lives on your phone, full stop. The streak and strength visualisations are among the clearest of any app, it is completely free, and its plain-vanilla focus is exactly what many people want. Being Android-only and having no web or iOS version is the main limitation.",
      },
      { t: "h3", text: "4. Streaks — best for iPhone and Apple Watch" },
      {
        t: "p",
        text: "Streaks is the polished paid option on iOS: up to 24 tasks, Siri integration, Apple Watch complications, and health-data hooks that auto-complete habits like \"close my rings\". It is beautifully made and a one-time purchase rather than a subscription. If you are all-in on Apple hardware and want habit tracking on your wrist, it is worth the price.",
      },
      { t: "h2", text: "Building a routine that actually sticks" },
      {
        t: "ol",
        items: [
          "Start with two habits, not ten — a 100% record on two beats a 40% record on ten",
          "Anchor new habits to existing ones — \"after I brush my teeth, I journal\", not \"at 9 PM I journal\"",
          "Use the two-day rule — never skip two days in a row; one miss is a rounding error, two is a new pattern",
          "Block your day into morning and night — routine blocks survive busy days far better than long flat lists",
          "Review weekly — kill habits that are dead weight, double down on the ones that stuck",
        ],
      },
      {
        t: "callout",
        text: "Track the streak, not the outcome. \"Read 10 pages\" builds a streak; \"become well-read\" does not.",
      },
    ],
    faqs: [
      {
        q: "Do habit streaks actually work?",
        a: "Yes, for most people, with two caveats. Streaks leverage loss aversion, which is a strong motivator for maintaining an established habit. They work best when you track concrete daily actions (\"read 10 pages\") rather than outcomes (\"get smarter\"), and when a single missed day does not make you quit — use the two-day rule instead of demanding perfection.",
      },
      {
        q: "What is the best free habit tracker app?",
        a: "Trackly is the strongest free option if you want habits alongside expenses, tasks and notes in one app, with AI-built routines and offline support. Habitica is best if game mechanics motivate you. Loop Habit Tracker is the best open-source choice on Android, with no ads and no account required.",
      },
      {
        q: "How long does it take to build a habit?",
        a: "Research from University College London (Lally et al.) found habits take anywhere from 18 to 254 days to become automatic, with an average of about 66 days. Simple habits (drinking water after waking) form faster than complex ones (daily exercise). Plan on two to three months of consistent tracking before a habit feels automatic.",
      },
    ],
  },
  // ===== 4 =====
  {
    slug: "student-budget-guide-mess-fees-hostel-rent",
    title: "Student Budget Guide: Mess, Rent & Pocket Money",
    h1: "Student Budget Guide: Mess Fees, Hostel Rent & Monthly Pocket Money",
    description:
      "A realistic monthly budget system for students — hostel rent, mess fees, mobile, travel and fun money — plus how to actually stick to it every month.",
    tagline: "Guides · Students",
    datePublished: "2026-10-16",
    dateUpdated: "2026-10-16",
    readingMinutes: 6,
    keywords: [
      "student budget app",
      "how to manage pocket money",
      "hostel budget",
      "mess fees tracker",
    ],
    blocks: [
      { t: "h2", text: "Where student money actually goes" },
      {
        t: "p",
        text: "Most student budgets fail because they are built around the wrong picture. The assumption is that big costs — hostel rent, mess fees — are the problem, but those are usually fixed, paid once a semester or month, and therefore easy to plan around. The actual leak is everything after them: the ₹120 food delivery \"just this once\", the ₹299 impulse sale purchase, the weekend outing that costs more than the whole week's mess food.",
      },
      {
        t: "table",
        head: ["Category", "Typical share", "Nature"],
        rows: [
          ["Hostel / room rent", "Fixed, paid monthly or per semester", "Predictable"],
          ["Mess / food", "Fixed monthly + daily extras", "Half-predictable"],
          ["Mobile & internet", "Fixed recharge cycle", "Predictable"],
          ["Travel / commute", "Usage-based", "Variable"],
          ["Fun, outings, deliveries", "Whatever is left", "The leak"],
        ],
      },
      {
        t: "p",
        text: "The pattern is universal: fixed costs behave, variable costs creep, and fun money quietly absorbs every rupee the other categories leave behind. A workable student budget does not try to eliminate the fun — it just gives fun money a number, the same way rent has one.",
      },
      { t: "h2", text: "The student version of 50/30/20" },
      {
        t: "p",
        text: "The classic 50/30/20 rule (needs/wants/savings) was designed for salaried adults with stable incomes, and it maps poorly onto student reality. A more honest student split is roughly 60/20/20: about 60% of your monthly money on the fixed essentials (rent, mess, recharge), about 20% on variable living (travel, stationery, daily extras), and about 20% on fun — with a small emergency buffer carved out before all three whenever possible.",
      },
      {
        t: "callout",
        text: "Pay yourself first, in reverse: the moment money arrives (allowance, stipend, scholarship), move the fun budget into a separate mental — or actual — account. When fun money is empty, the month's fun is done.",
      },
      { t: "h2", text: "A monthly system that survives the whole semester" },
      {
        t: "ol",
        items: [
          "Payday = budget day — the same hour your allowance arrives, write down rent, mess and recharge for the month",
          "Fixed costs leave first — if it recurs every month, it is not a decision, it is a subscription; treat it that way",
          "Set a weekly allowance for variable spend — ₹350/day feels small and is; ₹2,450/week is the same number and it is real",
          "Track mess cycles separately — mess paid per meal? Log it. Paid monthly? Divide by days and watch the true daily food cost",
          "Review every Sunday — five minutes: what did I actually spend, what is left, does next week need adjusting",
        ],
      },
      { t: "h2", text: "Using Trackly's student mode" },
      {
        t: "p",
        text: "[Trackly](/) has a dedicated student mode for exactly this system: monthly budget tracking beside expenses, a mess planner for meal cycles, hostel rent records, attendance, assignments, exams and a study planner — in one app instead of a folder of five. The expense tracker is fast enough that logging a ₹20 chai is realistic (type \"chai 20\", done), and the monthly reports show the true split between fixed, variable and fun spend, which is usually an eye-opener the first month.",
      },
      {
        t: "p",
        text: "The underrated part is that budgets in Trackly are visible daily, not buried in a report you open once a month. Seeing \"₹1,800 left of fun budget\" on the 18th changes the 19th's decisions in a way that a month-end spreadsheet never does.",
      },
      { t: "h2", text: "Seven quick wins that actually save money" },
      {
        t: "ul",
        items: [
          "Cook or mess twice more per week — the single biggest lever for most students",
          "Audit your recharge plan — most people are on a plan sized for a heavier user than they are",
          "UPI discipline — check the balance before, not after, the third food delivery of the week",
          "Second-hand books and notes — a semester's reading list at 30–40% of new price",
          "Cap the fun spend weekly, not monthly — monthly caps fail in week one; weekly caps self-correct",
          "No EMI on wants — if a phone needs 12 months of instalments, it is not this year's phone",
          "Keep a ₹2,000 emergency buffer — it is the difference between an inconvenience and a crisis",
        ],
      },
      {
        t: "p",
        text: "None of these are about suffering. The point of a student budget is the same as any budget: make the numbers visible early, so the month ends with money left by design rather than by luck. Get the system right in your first semester, and every semester after it runs on autopilot.",
      },
    ],
    faqs: [
      {
        q: "How much pocket money does a student need per month?",
        a: "It varies widely by city and lifestyle, but for most Indian students living in a hostel or PG (where rent and mess are paid separately), personal spending typically lands between ₹3,000 and ₹8,000 per month — higher in metros and for students who eat out frequently. The honest method is to track every expense for one month, then set your budget at that number minus 10%, rather than copying someone else's figure.",
      },
      {
        q: "What is the best budget app for students?",
        a: "Trackly is the strongest free option for students — it combines a monthly budget tracker with expenses, a mess planner, hostel rent records, attendance, assignments and exams in one app, which suits hostel life better than a pure finance app. Walnut works if you want automatic SMS-based tracking, and a simple spreadsheet works if you only want totals.",
      },
      {
        q: "How can students save money every month?",
        a: "The three levers that matter most: food (cook or mess more, order in less — usually 30–40% of variable spend), mobile plans (right-size your recharge to actual usage), and weekly fun caps (a weekly cap self-corrects; a monthly cap fails in week one). Add a small standing emergency buffer of about ₹2,000 before anything else. Saving as a student is less about big sacrifices and more about making the daily numbers visible.",
      },
    ],
  },

  // ===== 5 =====
  {
    slug: "what-is-a-pwa-install-web-apps-on-iphone-android",
    title: "What is a PWA? Install Web Apps on iPhone & Android",
    h1: "What is a PWA? (And How to Install Web Apps on iPhone & Android)",
    description:
      "A plain-English guide to progressive web apps: what a PWA is, how PWAs compare to native apps, and exact steps to install one on iPhone and Android.",
    tagline: "Explainers · Tech",
    datePublished: "2026-10-16",
    dateUpdated: "2026-10-16",
    readingMinutes: 5,
    keywords: [
      "what is a pwa",
      "install web app iphone",
      "add to home screen",
      "progressive web app vs native",
    ],
    featured: true,
    blocks: [
      { t: "h2", text: "What is a PWA?" },
      {
        t: "p",
        text: "A progressive web app (PWA) is a website that behaves like an app. You install it from the browser in seconds — no app store, no download queue — and it gets its own icon on your home screen, launches full-screen without a browser address bar, and can work offline because it stores its code and data on your device. From the home screen onward, most people cannot tell the difference between a well-made PWA and a native app.",
      },
      {
        t: "p",
        text: "The \"progressive\" part means the app earns its powers in layers: the site works in any browser, a better browser unlocks install and offline support, and a modern one adds push notifications. The same single codebase serves everyone — which is why teams from Twitter Lite to Starbucks to Uber built PWAs to reach users that big native downloads were losing.",
      },
      { t: "h2", text: "How to install a PWA on iPhone" },
      {
        t: "ol",
        items: [
          "Open the website in Safari — this only works in Safari; Chrome and other browsers on iOS cannot install web apps (an iOS limitation)",
          "Tap the Share button — the square with an arrow pointing up, at the bottom of the screen or next to the address bar",
          "Scroll down and tap \"Add to Home Screen\"",
          "Confirm the name and tap Add — the app's icon appears on your home screen like any other",
          "Launch it from the icon — it opens full-screen, with no browser UI, exactly like a native app",
        ],
      },
      {
        t: "p",
        text: "One iOS quirk worth knowing: notifications from PWAs require iOS 16.4 or later and only arrive after the app is installed to the home screen. Everything else — offline use, full-screen mode, the app icon — works on any recent iOS version.",
      },
      { t: "h2", text: "How to install a PWA on Android" },
      {
        t: "ol",
        items: [
          "Open the website in Chrome (or Edge, Brave, or Samsung Internet)",
          "Tap the menu — the three dots in the top-right corner",
          "Tap \"Install app\" or \"Add to Home screen\" (the label varies by browser)",
          "Confirm — the icon lands on your home screen and the app may also appear in your app drawer",
        ],
      },
      {
        t: "p",
        text: "Android also shows an \"Install\" button directly in Chrome's address bar on sites that support installation, which makes the process even shorter. Android PWAs additionally get full notification support from the start.",
      },
      { t: "h2", text: "PWA vs native app" },
      {
        t: "table",
        head: ["", "PWA", "Native app"],
        rows: [
          ["Install time", "Seconds, from the browser", "Minutes, via an app store"],
          ["Storage used", "Often under 5 MB", "Commonly 100–500 MB"],
          ["Updates", "Instant — always the latest version", "App store review, manual updates"],
          ["Offline support", "Yes, via service workers", "Yes"],
          ["Push notifications", "Android always; iOS 16.4+", "Yes"],
          ["Store fees", "None", "15–30% on purchases"],
          ["Deep device access", "Limited", "Full"],
        ],
      },
      {
        t: "p",
        text: "For everyday apps — trackers, notes, lists, tools — a PWA is usually the better deal for both sides: users get a fast install and a tiny footprint, and developers ship updates instantly instead of waiting for store review. Native still wins when an app needs deep hardware access: heavy games, camera suites, background sensors. If you are choosing for a to-do or expense app, the PWA route has essentially no downside.",
      },
      {
        t: "callout",
        text: "Trackly itself is a PWA — try it at [trackly.today/install](/install): install to your home screen in about 30 seconds, no store visit, no download wait.",
      },
      { t: "h2", text: "Why companies ship PWAs" },
      {
        t: "p",
        text: "Twitter's Twitter Lite was the famous early proof: the PWA used a fraction of the native app's data and storage, and engagement went up — because the biggest drop-off for the native app had been the download itself, not the experience after it. The same logic drives Starbucks, Uber and Pinterest's web apps: remove the install barrier, and more people actually arrive inside the product.",
      },
      {
        t: "p",
        text: "For users, the takeaway is simpler: next time a site you like offers \"Add to Home Screen\", try it. You get an app-shaped experience with none of the download, and — unlike a store app — the URL you installed from is the whole app, always current.",
      },
    ],
    faqs: [
      {
        q: "Is a PWA as good as a native app?",
        a: "For most everyday apps — trackers, notes, lists, tools — yes: a well-made PWA is visually indistinguishable from a native app, installs in seconds, uses far less storage, and updates instantly. Native apps still matter for heavy 3D games, advanced camera features and background sensor access. If your use case is a to-do list or expense tracker, a PWA has effectively no downside.",
      },
      {
        q: "Do progressive web apps work offline?",
        a: "Yes. PWAs use a service worker — a small script the browser keeps on your device — to cache the app's interface and data locally. You can open the app, view what you saved, and add new entries with no internet connection; changes sync once you are back online. Trackly, for example, is fully usable in airplane mode.",
      },
      {
        q: "How do I install a PWA on my iPhone?",
        a: "Open the website in Safari (this only works in Safari on iOS — Chrome cannot install web apps there). Tap the Share button, scroll down and choose \"Add to Home Screen\", then confirm. The app gets its own icon, launches full-screen like a native app, and works offline. The whole process takes about 30 seconds.",
      },
    ],
  },

  // ===== 6 =====
  {
    slug: "trackly-vs-walnut-vs-money-manager",
    title: "Trackly vs Walnut vs Money Manager — Honest Comparison (2026)",
    h1: "Trackly vs Walnut vs Money Manager (2026)",
    description:
      "Trackly vs Walnut vs Money Manager compared honestly: automatic SMS logging vs manual control, offline use, privacy, reports — and which one fits you.",
    tagline: "Comparisons · Expenses",
    datePublished: "2026-10-19",
    dateUpdated: "2026-10-19",
    readingMinutes: 6,
    keywords: [
      "trackly vs walnut",
      "walnut vs money manager",
      "expense app comparison india",
      "automatic vs manual expense tracking",
    ],
    blocks: [
      { t: "h2", text: "The three apps, one paragraph each" },
      {
        t: "p",
        text: "These three apps sit at three very different points on the same spectrum. Walnut automatically reads your bank and card SMS messages and builds your expense history with zero typing. Money Manager is the classic manual ledger: you type every transaction yourself and get genuinely strong reports in return. Trackly is an offline-first, all-in-one life tracker where expenses are one module among habits, tasks, notes, shopping lists and borrowing — logged by hand or by talking to its AI assistant.",
      },
      {
        t: "callout",
        text: "Full transparency: Trackly is made by ahexa.studio — the publisher of this guide. That is exactly why this comparison holds it to the same standard as the other two: if it loses a round, the table below says so.",
      },
      { t: "h2", text: "Automatic vs manual — the real trade-off" },
      {
        t: "p",
        text: "The core decision is not which app is \"better\" — it is whether you want a machine to guess your spending or want to own every entry yourself. Automatic logging means you never break the chain because you forgot to type: if a transaction sends an SMS, it gets recorded. The cost is trust. You are handing an app permanent permission to read every SMS on your phone — bank OTPs, personal messages, everything the SIM receives — and you are trusting its merchant-name parsing to be right on food delivery, fuel and UPI.",
      },
      {
        t: "p",
        text: "Manual logging is the opposite trade. You get perfect data fidelity, no SMS permission, and the act of typing an expense is itself the budget-consciousness exercise — behavioural studies consistently find that people who write purchases down spend less, simply because the friction creates a moment of reflection. The risk is abandonment: if entering transactions feels like homework, week three arrives and the ledger is empty.",
      },
      {
        t: "p",
        text: "Trackly's answer to that risk is lowering the cost of the manual step: a Quick Add sheet that opens from anywhere in the app, and an AI assistant that accepts \"momo 70 kharcha hua\" in Hinglish and files the expense for you. It is still manual in spirit — you decide what gets recorded — but the typing burden drops to near zero.",
      },
      {
        t: "table",
        head: ["Feature", "Trackly", "Walnut", "Money Manager"],
        rows: [
          ["Entry method", "Quick Add + AI (voice/text)", "Automatic (bank SMS)", "Manual double-entry"],
          ["Needs SMS permission", "No", "Yes — reads all SMS", "No"],
          ["Works fully offline", "Yes (offline-first PWA)", "Partial — needs SMS to arrive", "Yes"],
          ["Free core", "Yes, entirely", "Yes (ads/upsell)", "Yes (ads; pro one-time)"],
          ["Reports", "Daily/monthly, AI Q&A on data", "Auto-categorised trends", "Best-in-class, deep"],
          ["Beyond money", "Habits, tasks, notes, groups", "Bills, credit offers", "Budgets only"],
          ["Install", "30s web install, ~1 MB", "Play Store app", "Play Store app"],
        ],
      },
      { t: "h2", text: "Which one should you pick?" },
      {
        t: "p",
        text: "Pick Walnut if your priority is zero effort and you are comfortable with an app reading your SMS. It is the closest thing to a set-and-forget spending record, and its automatic categorisation is genuinely good. Just go in knowing the privacy model: the SMS inbox is the data source, and the app's business is built on top of it.",
      },
      {
        t: "p",
        text: "Pick Money Manager if you treat expense tracking as a discipline and want the deepest reports in the category. People who enjoy the ledger habit — the same people who reconcile bank statements line by line — are its natural users. It does nothing outside money, and that focus is precisely its strength.",
      },
      {
        t: "p",
        text: "Pick Trackly if you want one private app for your whole day — money plus habits, tasks, notes, shopping and who-owes-whom — with no SMS permission and full offline use, and you would rather type (or say) two words than give an app your inbox. Try it at [trackly.today/install](/install); it installs in about 30 seconds and there is no account required to look around.",
      },
      {
        t: "ul",
        items: [
          "Want zero effort and accept SMS access → Walnut.",
          "Want the deepest reports and enjoy the habit → Money Manager.",
          "Want one app for life, private and offline → Trackly.",
        ],
      },
      {
        t: "callout",
        text: "The winner is decided by week three, not day one. Whichever app you still open in a month is the one that was right for you.",
      },
    ],
    faqs: [
      {
        q: "Is automatic expense tracking better than manual?",
        a: "Automatic tracking wins on convenience — if a transaction sends an SMS, it gets logged without you doing anything. Manual tracking wins on privacy and awareness: no app reads your messages, and the act of writing a purchase down makes you spend less. Automatic is better for people who would otherwise not track at all; manual is better for people who want to feel every rupee.",
      },
      {
        q: "Does Walnut need SMS permission to work?",
        a: "Yes. Walnut's core mechanism is reading transaction SMS messages sent by banks and card networks, so it asks for full SMS access on Android. That permission covers all messages the SIM receives, not only banking ones. On iOS this model is not possible, which is why SMS-reading expense trackers are an Android phenomenon.",
      },
      {
        q: "Can Trackly track expenses without any typing?",
        a: "Mostly, yes — you still decide what gets recorded, but you do not have to type it. The AI assistant accepts plain English or Hinglish (\"momo 70 kharcha hua, add kar do\") and files the expense, and voice input lets you speak the entry. It is manual in spirit — nothing is inferred without you — but the typing burden is close to zero.",
      },
    ],
  },

  // ===== 7 =====
  {
    slug: "how-to-build-a-morning-routine-that-sticks",
    title: "How to Build a Morning Routine That Sticks (Science + Template)",
    h1: "How to Build a Morning Routine That Actually Sticks",
    description:
      "A realistic morning routine system: the habit-loop science, a 30-minute template, habit stacking, and how to survive breaking a streak. Based on the 66-day research.",
    tagline: "Guides · Habits",
    datePublished: "2026-10-19",
    dateUpdated: "2026-10-19",
    readingMinutes: 6,
    keywords: [
      "morning routine",
      "how to build a morning routine",
      "morning habits",
      "habit stacking",
    ],
    featured: true,
    blocks: [
      { t: "h2", text: "Why most morning routines die by day 12" },
      {
        t: "p",
        text: "Almost every failed morning routine shares the same autopsy result: it was designed for a person who does not exist. It assumes you sleep at a fixed hour, wake without grogginess, and have a morning with no obligations until 9 AM. Then real life arrives — a late-night message thread, a 7 AM deadline, a monsoon power cut — and the routine collapses on the first bad day. The problem is not discipline; it is that the routine was built as a schedule instead of as a system.",
      },
      {
        t: "p",
        text: "A schedule says \"6:00 wake, 6:15 meditation, 6:45 workout\". A system says \"wake, then do the first anchor, then chain the rest\". Systems survive bad days because their steps are ordered, not timed. The single most useful shift you can make this week is deleting the clock column from your routine and keeping only the order.",
      },
      {
        t: "callout",
        text: "Delete the clock column. A routine that depends on the time you wake up is broken by design; a routine that depends only on order survives any morning.",
      },
      { t: "h2", text: "The science in one paragraph" },
      {
        t: "p",
        text: "Habit research (most famously Phillippa Lally's University College London study) puts the average time to automaticity at about 66 days — with huge variance from 18 to 254 days depending on the person and the habit. Two findings matter more than the number. First, missing a single day does not measurably damage habit formation — the \"never break the chain\" rule is motivational folklore, not data. Second, habits form faster when the behaviour follows a stable cue, which is exactly what an existing morning habit provides for free.",
      },
      { t: "h2", text: "Build it: anchor, stack, shrink" },
      {
        t: "h3",
        text: "1. Pick one anchor you already do daily",
      },
      {
        t: "p",
        text: "An anchor is a behaviour you never skip — brushing your teeth, making your first chai, unlocking your phone after waking. You do not need willpower for the anchor; it already happens. The anchor's job is to be the cue that triggers everything after it. Choose one, say it out loud in the \"after X, I will Y\" format, and write it down where you will see it tomorrow morning.",
      },
      {
        t: "h3",
        text: "2. Stack new habits onto the anchor",
      },
      {
        t: "p",
        text: "Habit stacking — popularised by BJ Fogg and James Clear — attaches each new behaviour to the end of the previous one, so the growing chain is really one long habit with multiple steps. The chain is also self-repairing: if you miss a middle link one morning, you rejoin at the next link instead of writing off the day. This is why chains beat lists — a missed item on a list invalidates nothing, but a broken chain feels like a failure and starts the abandonment spiral.",
      },
      {
        t: "h3",
        text: "3. Shrink every step to two minutes",
      },
      {
        t: "p",
        text: "The two-minute rule is not a productivity cutesy — it is the on-ramp. \"Read 10 pages\" survives bad weeks; \"read one chapter\" does not. The version of the habit you do on your worst day is the real habit; everything above it is a bonus. On good days you will naturally exceed two minutes. On bad days the minimum keeps the identity intact: you are still a person who reads every morning, and identities are what compound.",
      },
      {
        t: "table",
        head: ["Stack position", "Habit", "Two-minute version"],
        rows: [
          ["Anchor", "Make first chai / coffee", "(already happens)"],
          ["Link 1", "Write 3 must-dos for the day", "3 lines, one line each"],
          ["Link 2", "Read", "One page — really"],
          ["Link 3", "Move", "10 squats beside your desk"],
          ["Link 4", "Log the morning", "Open app, tick the boxes"],
        ],
      },
      { t: "h2", text: "A realistic 30-minute template" },
      {
        t: "ol",
        items: [
          "Wake, curtains open, phone stays on charge — first anchor is your feet on the floor, not your thumb on a screen.",
          "Water, then the beverage ritual. Making the drink is the anchor; standing at the kettle without your phone is the actual habit.",
          "Three lines in a note: today's must-dos. Not a plan — just the three things that would make today count.",
          "10–20 minutes of movement. Stretching, a walk, anything. Two-minute floor on bad days.",
          "Read one page minimum. Log the morning in a tracker — visible streaks are the cheapest motivation ever invented.",
        ],
      },
      {
        t: "p",
        text: "Tracking matters more than it sounds. A tick in a box is a small dopamine receipt, and the streak number turns an abstract identity (\"I'm becoming a morning person\") into a concrete score you protect. In Trackly, morning habits live in the Habits module — you set a daily goal (8 glasses, 10 pages), the streak counter updates on each check-in, and the AI assistant can even build the routine with you (\"make me a 30-minute morning routine\"). It is free with the rest of the app at [trackly.today/install](/install), and the [habit-tracker comparison guide](/blog/best-habit-tracker-apps-with-streaks) covers the alternatives honestly.",
      },
      { t: "h2", text: "When you break the streak (you will)" },
      {
        t: "p",
        text: "The data says one missed day costs almost nothing; two in a row is where identity damage begins. So the rule is never-miss-twice. The morning after a broken day, run the two-minute version of every link and nothing more — the goal is restarting the chain, not catching up on lost work. Guilt is a terrible motor; a shrinking habit is a much better one.",
      },
      {
        t: "callout",
        text: "Track the streak, not the outcome. \"Read 10 pages\" builds a streak; \"become well-read\" does not.",
      },
    ],
    faqs: [
      {
        q: "How long does it take to build a morning routine?",
        a: "Research puts the average at about 66 days for a single habit to become automatic, with a wide range of roughly 18 to 254 days depending on difficulty and person. A full routine — several habits chained together — typically takes two to three months of consistent cues to feel effortless. Missing one day does not set you back measurably; missing twice in a row is what actually breaks formation.",
      },
      {
        q: "What is habit stacking?",
        a: "Habit stacking means attaching a new habit to the end of a habit you already have, using the format \"after X, I will Y\". The existing behaviour becomes the cue for the new one, so you do not rely on motivation or memory. For example: after I make my morning chai, I will write three must-dos for the day. It works because every established habit is a free, reliable trigger.",
      },
      {
        q: "What should I do the day after breaking my streak?",
        a: "Run the two-minute version of every habit and nothing more. If you read one page instead of ten, the streak technically survives and the identity — \"I am a person who reads every morning\" — stays intact. The rule that matters is never miss twice in a row. Trying to \"make up\" for a lost day with a heroic session usually creates the pressure that kills the routine a second time.",
      },
    ],
  },

  // ===== 8 =====
  {
    slug: "how-to-split-trip-expenses-with-friends",
    title: "How to Split Trip Expenses with Friends (Goa Edition)",
    h1: "How to Split Trip Expenses with Friends — the Goa Edition",
    description:
      "The honest guide to splitting trip expenses: pooling vs rotation vs running a ledger, settle-up rules that save friendships, and how group apps handle the math.",
    tagline: "Guides · Groups",
    datePublished: "2026-10-19",
    dateUpdated: "2026-10-19",
    readingMinutes: 6,
    keywords: [
      "split trip expenses",
      "trip expense splitting",
      "goa trip budget",
      "how to split expenses with friends",
    ],
    blocks: [
      { t: "h2", text: "The last-night problem" },
      {
        t: "p",
        text: "Every group trip ends the same way: the last evening, someone opens a notes app, types \"so let's settle\", and the next forty minutes are spent reconstructing four days of meals, cabs, entries and shacks from memory. Someone's calculator disagrees with someone else's. The person who paid for the petrol is sure it was 2,400 and the person who paid the cab is sure it was not 900. The trip was great; the settlement is where friendships go to die.",
      },
      {
        t: "p",
        text: "The fix is not being more organised at the airport — it is choosing a splitting method on day zero and logging costs as they happen. Everything below assumes seven friends, four days in Goa, and a healthy fear of the last-night spreadsheet.",
      },
      {
        t: "callout",
        text: "Decide the method on day zero, log on the spot, settle on the last morning — never the last night, when everyone is tired and defensive.",
      },
      { t: "h2", text: "Method 1: The common pool (best for most trips)" },
      {
        t: "p",
        text: "Everyone puts an equal amount into a pool at the start — say 5,000 each — and all shared costs (rooms, cabs, meals eaten together, entry fees) come out of the pool. The bookkeeping is trivial because there is exactly one ledger: the pool balance. If the pool runs low mid-trip, everyone tops up equally again. At the end, whatever remains is divided back equally.",
      },
      {
        t: "p",
        text: "The pool's weakness is personal spending. Your shopping at the Anjuna flea market is not a group cost, and neither is the person who upgrades to jet-ski while everyone else watches. The pool should cover only genuinely shared costs; a strict \"pool vs personal\" line drawn on day one prevents every later argument about what counts.",
      },
      { t: "h2", text: "Method 2: Rotation (the zero-effort option)" },
      {
        t: "p",
        text: "No pool at all. Costs are paid by whoever has a card or UPI handy at the moment, and each person roughly takes turns. At the end of the trip, everyone declares what they paid, the total is divided by seven, and anyone who paid more than the average gets the difference back from those who paid less.",
      },
      {
        t: "p",
        text: "Rotation fails in exactly one way: memory. Four days in, nobody remembers whether the Baga dinner was 3,100 or 3,800, and the guesses always drift downward from the people who owe money. If you rotate, the log must be written down at the moment of payment — a one-line entry per cost is all it takes, and it is the difference between a 10-minute settlement and a 40-minute negotiation.",
      },
      { t: "h2", text: "Method 3: The running ledger (most accurate)" },
      {
        t: "p",
        text: "Every shared cost is entered into a ledger with the payer's name, and the app (or sheet) continuously computes who owes the group and who is owed. This is what Splitwise made mainstream, and it is what Trackly's Groups module does natively — you create the \"Goa 2026\" group, add expenses as they happen with the payer attached, and the per-person balances and the minimal settle-up transfer list are always current. The last-night conversation becomes \"the app says two transfers and we're done\".",
      },
      {
        t: "table",
        head: ["Method", "Effort during trip", "Accuracy", "Best for"],
        rows: [
          ["Common pool", "Very low", "Medium (personal spend leaks)", "Short trips, similar spending styles"],
          ["Rotation", "Zero at the moment", "Low — memory-dependent", "Small groups who trust each other"],
          ["Running ledger", "One line per cost", "Highest", "Mixed spenders, longer trips"],
        ],
      },
      { t: "h2", text: "How the settle-up math works" },
      {
        t: "p",
        text: "The naive settlement — everyone who paid more than average collects from everyone who paid less — produces an O(n²) mess of transfers. The correct approach computes a minimal set of transfers: sort people by balance, pair the biggest creditor with the biggest debtor, transfer the smaller of the two amounts, knock both out or reduce them, repeat. For seven people this typically means four or five transfers instead of twenty, which is the difference between a settlement people actually complete and one they abandon with \"bhai chhod yaar\".",
      },
      {
        t: "p",
        text: "Trackly Groups does this automatically, and so does a spreadsheet with the right formulas — the math is not the hard part. The hard part is having the numbers at all, which is why the log-on-the-spot habit matters more than the tool. The roommate version of this problem (rent, groceries, utilities) has its own guide: [how to split expenses with roommates](/blog/how-to-split-expenses-with-roommates).",
      },
      { t: "h2", text: "Rules that keep the friendship intact" },
      {
        t: "ul",
        items: [
          "Settle on the last morning, not the last night — tired people negotiate badly.",
          "Shared costs only in the ledger; personal shopping never enters the group math.",
          "One person owns the log; everyone else gets read access. Two loggers means two versions of truth.",
          "Round generously. Absorbing a 30 rupee discrepancy costs less than the argument about it.",
          "Cash settlements on the spot, UPI the same evening. \"Kal de dunga\" is how group money disappears.",
        ],
      },
      {
        t: "callout",
        text: "A trip's actual cost is not what you spent. It is what you spent plus the interest-free loan you gave the friend who still owes 800 and has stopped bringing it up.",
      },
    ],
    faqs: [
      {
        q: "What is the best way to split expenses on a group trip?",
        a: "For most groups: a common pool for shared costs (rooms, cabs, group meals) combined with personal spending staying personal. Everyone contributes an equal amount at the start, shared costs come from the pool, and the remainder is split back equally. For longer trips or very different spending styles, a running ledger with per-person balances is more accurate — apps like Trackly Groups or Splitwise compute the settle-up transfers automatically.",
      },
      {
        q: "How do you split expenses when people spend very differently?",
        a: "Separate shared from personal spending on day one. Only genuinely shared costs — accommodation, transport, meals eaten together, entry fees — enter the group math; anything personal (shopping, spa, solo activities) is that person's own cost. Within shared costs, if one couple books a better room or someone insists on a rented scooter, either equalise it consciously or log it as a named extra so the ledger reflects reality.",
      },
      {
        q: "Should we pool money at the start of a trip?",
        a: "Yes, for most trips of up to about a week — pooling removes almost all mid-trip negotiation. Each person contributes an equal amount, shared costs are paid from the pool, and the balance is refunded equally at the end. The two rules that make it work: the pool covers only shared costs, and it is topped up equally when it runs low, so nobody quietly becomes the group's creditor.",
      },
    ],
  },

  // ===== 9 =====
  {
    slug: "best-student-apps-for-college-2026",
    title: "Best Student Apps for College (2026) — Honest Shortlist",
    h1: "The Best Student Apps for College (2026)",
    description:
      "The honest 2026 shortlist of college apps: notes, study, money and time — Notion, Anki, Trackly, Forest and more, with what each is genuinely best at.",
    tagline: "Lists · Students",
    datePublished: "2026-10-19",
    dateUpdated: "2026-10-19",
    readingMinutes: 5,
    keywords: [
      "best student apps",
      "college apps 2026",
      "apps for students",
      "student productivity apps",
    ],
    blocks: [
      { t: "h2", text: "How this list was made (and its one bias)" },
      {
        t: "p",
        text: "The rule for this list: every app earns its place for a specific job, and the job is named. No app appears because it is popular; several very popular apps failed the cut. The list is also deliberately short — the strongest predictor of app abandonment is installing eight of them in Fresher's week, so treat this as a menu to choose three or four from, not a shopping list.",
      },
      {
        t: "callout",
        text: "Full transparency: this guide is published by ahexa.studio, which also makes Trackly (the money and habits entry below). Every other app here is made by someone else, and the picks below it are tools we use and pay for with our own money.",
      },
      { t: "h2", text: "Notes and knowledge" },
      {
        t: "p",
        text: "Winner: Notion (notion.so) — the default answer for a reason. One workspace holds lecture notes, assignment trackers, semester plans and shared project pages, and the free education tier is genuinely generous. The cost is a learning curve measured in days, not minutes, and a temptation to spend the first month building systems instead of taking notes. Runner-up: Google Keep (keep.google.com) — the anti-Notion. Instant, zero-setup capture for the thought you have between two lectures. Keep is for grabbing; Notion is for organising. Many students use both and lose nothing.",
      },
      { t: "h2", text: "Study and focus" },
      {
        t: "p",
        text: "Winner: Anki (apps.ankiweb.net) — spaced repetition is the closest thing learning science has to a cheat code, and Anki is its purest form. The desktop and web versions are free; the mobile app is a one-time purchase that outlasts your degree. The catch is real: Anki only works if you write the cards yourself, because writing the card is half the learning. Runner-up: Forest (forestapp.cc) — a focus timer that grows a tree while you work and kills it if you leave the app. It will not fix your discipline by itself, but as a visible score for focused sessions it does the job, and the grown forest is a weirdly effective trophy case.",
      },
      { t: "h2", text: "Money" },
      {
        t: "p",
        text: "Winner: Trackly (trackly.today) — the money entry, and yes, the biased one, so here is the case in full. College money is not complicated finance: it is a monthly allowance, a mess account, a hostel budget and the slow accumulation of \"Rohan owes me 300\" entries across a semester. Trackly handles that exact shape — expenses, a borrow/lend ledger, shopping lists, group splitting for the hostel floor's food runs, and habit tracking for the routine — in one free app that works offline and installs from the browser in 30 seconds ([install guide](/install)). Its AI assistant takes entries conversationally in English or Hinglish, which is faster than any form. The alternatives are either bank-SMS readers that want your inbox or heavyweight trackers designed for salaried adults with mutual funds. If you want the details, the [student budget guide](/blog/student-budget-guide-mess-fees-hostel-rent) breaks down the 60/20/20 system this app was built around.",
      },
      { t: "h2", text: "Time and deadlines" },
      {
        t: "p",
        text: "Winner: your college's own app (LMS/CANVAS/Moodle) — the single most underrated student app is the unglamorous official one, because it is the only place where deadlines actually live. Check it on day one of every semester. Runner-up: Google Calendar (calendar.google.com) — not for its features but for its universality: it syncs with everything, every shared group project eventually lands in it, and the week view is the honest mirror of how you actually spend your time. A calendar you look at every morning is worth three planners you mean to look at.",
      },
      {
        t: "table",
        head: ["App", "Job", "Free?", "One-line verdict"],
        rows: [
          ["Notion", "Notes + systems", "Yes (education tier)", "Powerful; do not spend your first month on templates."],
          ["Google Keep", "Instant capture", "Yes", "The fastest way to not forget a thought."],
          ["Anki", "Remembering", "Desktop/web free", "The science is real; writing cards is the price."],
          ["Forest", "Focus sessions", "Free on Android", "A visible score for focused hours."],
          ["Trackly", "Money + habits + IOUs", "Yes, entirely", "Built for the exact shape of student money."],
          ["Google Calendar", "Deadlines", "Yes", "The only planner that syncs with everyone."],
        ],
      },
      { t: "h2", text: "What did not make the list" },
      {
        t: "p",
        text: "Full-featured PDF annotation apps mostly lost to pen and paper; students who annotate heavily know which one they want already. Premium \"all-in-one student planners\" lost because they duplicate Notion with a subscription. And gamified habit apps lost to Trackly's streak counter for the specific habits students actually track — water, sleep, study hours, gym. The honest summary: your notes app, your flashcards, your money app and your calendar. Four jobs, four apps, one semester at a time.",
      },
      {
        t: "callout",
        text: "The best student app is the one that survives exam week. Everything else is a Freshers' fair purchase.",
      },
    ],
    faqs: [
      {
        q: "What apps do college students actually need?",
        a: "Four, one per job: a notes app (Notion, or Google Keep for speed), a spaced-repetition flashcards app (Anki), a money tracker with a borrow/lend ledger (Trackly), and a calendar synced to your college's deadline system (Google Calendar). Anything beyond those four is a nice-to-have. Installing eight apps in week one is the most reliable way to be using zero by week six.",
      },
      {
        q: "Is Notion good for college students?",
        a: "Yes, with one warning. Notion is excellent as a single workspace for lecture notes, semester plans and group project pages, and its free education tier removes the cost objection. The warning: Notion rewards building systems, and it is very easy to spend your first month crafting templates instead of taking notes. Start with three pages — notes, deadlines, projects — and add structure only when a real need appears.",
      },
      {
        q: "What is the best app for tracking student expenses?",
        a: "One that matches how student money actually works: a monthly allowance, mess and hostel costs, small daily spending, and friends owing each other small amounts across a semester. Trackly is built for that exact shape — expenses, a borrow/lend ledger, group splitting and shopping lists in one free offline app. Bank-SMS readers like Walnut work too, but they trade your SMS inbox for automation; see the full comparison in the expense tracker guide.",
      },
    ],
  },

  // ===== 10 =====
  {
    slug: "what-is-hinglish-ai",
    title: "What is Hinglish AI? Inside Trackly's Assistant",
    h1: "What is Hinglish AI?",
    description:
      "Hinglish AI understands the way India actually types — Roman-script Hindi mixed with English. What it is, why it matters, and how Trackly's assistant uses it.",
    tagline: "Explainers · AI",
    datePublished: "2026-10-19",
    dateUpdated: "2026-10-19",
    readingMinutes: 5,
    keywords: [
      "hinglish ai",
      "hindi english ai assistant",
      "ai assistant india",
      "roman script hindi ai",
    ],
    featured: true,
    blocks: [
      { t: "h2", text: "The language nobody designed" },
      {
        t: "p",
        text: "Type a message to a friend in India about yesterday's lunch. It will probably look like this: \"kal momo khaye the, 70 rupaye lagte hain, mast tha\". Three languages' worth of vocabulary, one Roman keyboard, zero effort spent deciding. That mixture — Hindi grammar and everyday words written in the Latin alphabet, with English nouns and connectors wherever they are shorter — is Hinglish. Nobody planned it. It is simply what happens when hundreds of millions of people type in a script their keyboard makes easy, in languages their tongue prefers.",
      },
      {
        t: "p",
        text: "It is also, quietly, one of the hardest things for software to handle well. Hinglish is not a standard: it has no dictionary of record, no official spelling (\"kar diya\" and \"kar diya\" and \"kardiya\" are all the same phrase), and it blends into full English without a border. Most tools treat it as an error state — either forcing formal Devanagari Hindi, or answering in stiff English and hoping you adapt. Both miss the point. The way you text is the way you think; an assistant that cannot follow it is always one step of translation away from you.",
      },
      {
        t: "callout",
        text: "Type like you text. That is the entire feature. If an AI needs you to change languages to use it, the AI is the problem.",
      },
      { t: "h2", text: "So what is Hinglish AI?" },
      {
        t: "p",
        text: "A Hinglish AI is an assistant that meets you in that mixed register: it understands Roman-script Hindi with English folded in, replies in the same natural mixture, and never demands that you pick one language and stay in it. Three properties define it. First, comprehension: \"momo 70 rupaye kharcha hua, add kar do\" is understood as an expense entry instruction, not a translation exercise. Second, register-matching: the reply comes back in the same blend — \"✅ Momo ₹70 add kar diya! Aaj ka kharcha ab ₹148 hai\" — not in formal Hindi or textbook English. Third, script respect: it writes the way you typed, in Roman script, because that is how you read fastest.",
      },
      {
        t: "p",
        text: "The distinction matters most in the boring moments, not the impressive ones. Nobody opens an expense tracker to enjoy the AI. They open it on a bus, one-handed, with 12% battery, and the win is not hearing about the model — it is that \"kal gym jaana hai yaad dila dena\" became a task for tomorrow in one message, in the exact words they thought it in.",
      },
      { t: "h2", text: "How Trackly's assistant does it" },
      {
        t: "p",
        text: "Trackly's assistant detects the language of each message before answering. A message with Roman-Hindi markers — \"hai\", \"kharcha\", \"kal\", \"kar diya\" — switches the whole reply into mostly-Hinglish with natural English mixed in, because that is how actual Hinglish speakers talk: the expense words stay English (₹70, category names), the connective tissue stays Hindi. A message in plain English gets a clean English reply, and the same user can alternate turn by turn — the detection is per message, so nothing is locked in.",
      },
      {
        t: "p",
        text: "The important half is what the assistant does with the words. Understanding a sentence is table stakes; the useful part is acting on it in your data. \"Aaj kitna kharcha hua?\" is answered from your actual expense history for today. \"Momo 70 rupaye kharcha hua, add kar do\" creates the expense, category included, and confirms in Hinglish. \"Kisko paise dene hain?\" reads your borrow/lend ledger and answers from it. Language matching is the interface; the data is the product. Both work offline with the rest of the app at [trackly.today/install](/install).",
      },
      {
        t: "table",
        head: ["You type", "Hinglish AI does", "Why it matters"],
        rows: [
          ["\"momo 70 kharcha hua, add kar do\"", "Creates the expense, replies in Hinglish", "Zero navigation, zero forms"],
          ["\"aaj kitna kharcha hua?\"", "Answers from today's real data", "The answer is yours, not a guess"],
          ["\"kal gym jaana hai, yaad dila dena\"", "Task for tomorrow in the calendar", "One sentence becomes a reminder"],
          ["\"kisko paise dene hain?\"", "Reads your borrow/lend ledger", "Plain answer from real entries"],
        ],
      },
      { t: "h2", text: "Why Roman script, not Devanagari" },
      {
        t: "p",
        text: "Because that is the choice Hinglish speakers already made. Reading speed tests and sheer behaviour both point the same way: the generation that grew up typing on QWERTY phones reads Roman-script Hindi faster than Devanagari, and finds formal Hindi in any script feel like a news bulletin. A helpful assistant should never feel like a news bulletin. Trackly's rule is simple and absolute: you typed it Roman, you get it back Roman — the same register you used, no upgrade, no correction.",
      },
      {
        t: "callout",
        text: "The test of a Hinglish AI is not whether it can handle a paragraph of philosophy. It is whether \"kitna kharcha hua aaj?\" gets you a number in two seconds.",
      },
    ],
    faqs: [
      {
        q: "What is Hinglish AI?",
        a: "A Hinglish AI is an assistant that understands and replies in the mixed Hindi-English register most of India actually types in — Hindi grammar and everyday words written in the Roman alphabet, with English folded in (\"momo 70 rupaye kharcha hua, add kar do\"). It matches your language per message, answers in the same natural blend, and never forces you to switch to formal Hindi or textbook English to be understood.",
      },
      {
        q: "Can AI actually understand Hinglish?",
        a: "Yes — and better than most people expect, because Hinglish is largely predictable English-plus-Hindi vocabulary on stable grammar. The hard part is not comprehension; it is register-matching: replying in the same natural mixture (\"✅ Momo ₹70 add kar diya!\") instead of stiff English or formal Devanagari Hindi. Per-message language detection is what lets a user alternate between English and Hinglish turn by turn without confusing the assistant.",
      },
      {
        q: "Why do Hinglish AI assistants reply in Roman script instead of Devanagari?",
        a: "Because Roman script is what Hinglish speakers type and read fastest. Hinglish was born on QWERTY keyboards, so its native script is Roman — \"kar diya\" written any other way reads as a different, more formal register. An assistant that switches you to Devanagari is doing the linguistic equivalent of answering slang with a press release. Trackly's rule is absolute: you typed it Roman, you get it back Roman.",
      },
    ],
  },
  // ===== 11 (Hinglish — targets "kharcha track karne wala app" style queries) =====
  {
    slug: "kharcha-track-karne-wala-app",
    title: "Kharcha Track Karne Wala App: Free Guide (Hinglish)",
    h1: "Kharcha Track Karne Wala App — Kaunsa Rakhein? (Free Hinglish Guide)",
    description:
      "Kharcha track karne wala app chunte waqt kya dekhein — SMS-reading apps, manual entry ya AI wala. Honest Hinglish guide: privacy, offline use, budget aur udhaar ka hisab.",
    tagline: "Guides · Hinglish",
    datePublished: "2026-10-26",
    dateUpdated: "2026-10-26",
    readingMinutes: 6,
    keywords: [
      "kharcha track karne wala app",
      "kharcha wala app",
      "paise ka hisab app",
      "kharcha tracker app",
      "paisa track karne ka tarika",
    ],
    blocks: [
      { t: "h2", text: "Kharcha track karna itna mushkil kyun ho jata hai" },
      {
        t: "p",
        text: "Mahine ki shuruat mein sab plan hota hai: is baar paise bachaenge, budget banaenge, hisab rakhenge. Pandrah din baad wahi haal — kitna nikla, pata hi nahi chala. Problem motivation nahi hai; problem hai ki likhna mushkil hai. Ek chai ₹20, ek auto ₹60, ek impulse order ₹340 — jab har cheez 11 taps ke form se guzarni pade, toh dimaag ne week do mein hi quit kar diya. Research baar-baar wahi baat bolti hai: agar entry lagane mein 10 second se zyada lagta hai, toh log teen hafte tak nahi tikte.",
      },
      {
        t: "p",
        text: "UPI ne paise udana do-tap bana diya hai, toh likhna usse bhi tez hona chahiye. Isi liye kharcha app chunte waqt pehla sawal yeh hona chahiye: **ek entry lagne mein kitna time lagta hai?** Baaki sab — reports, budgets, graphs — uske baad aata hai, kyunki jo app chhoda jaye uske features ka koi matlab nahi.",
      },
      { t: "h2", text: "Kharcha track karne ke 3 tareeke — aur unke trade-offs" },
      {
        t: "p",
        text: "**Tareeka 1: SMS-reading apps (automatic).** Walnut, Money View jaise apps aapke bank SMS khud padh ke expenses bana dete hain. Zero effort — lekin iske liye app ko aapke SAARE messages ka access chahiye hota hai, OTPs samet. Yeh un logon ke liye badhiya hai jo kabhi manually kuch nahi likhenge; bas yeh jaan ke rakhien ki convenience ki keemat privacy mein milti hai, aur aise apps apna paisa loans aur credit cards bech ke kamate hain.",
      },
      {
        t: "p",
        text: "**Tareeka 2: Diary ya manual app.** Purana tareeka, jo ab bhi kaam karta hai. Poora control, zero privacy concern — lekin speed ka issue wahi hai: roz likhna padta hai, aur rozedari hi woh cheez hai jo tootti hai. Spreadsheet wale is category mein sabse aage hain aur sabse pehle haar maante hain.",
      },
      {
        t: "p",
        text: "**Tareeka 3: AI-assisted manual.** Beech ka raasta: aap likho, par app samjhe. \"Momo 70 rupaye kharcha hua\" type karo — app expense bana deta hai, category samet. Speed automatic jaisi, privacy manual jaisi. [Trackly](/) isi model pe bana hai, isliye hum is guide mein isko detail mein todenge — saath mein yeh bhi batayenge ki kab doosra tareeka better hai.",
      },
      {
        t: "table",
        head: ["Tareeka", "Entry speed", "Privacy", "Kiske liye"],
        rows: [
          ["SMS-reading app", "Zero effort (automatic)", "App saare messages padhta hai", "Jo kabhi manually nahi likhenge"],
          ["Diary / spreadsheet", "Slow (roz likhna padta hai)", "Full private", "Jo rozedari se enjoy karte hain"],
          ["AI-assisted (Trackly)", "~5 second, typed ya bola hua", "Koi SMS access nahi", "Jo fast + private dono chahte hain"],
        ],
      },
      { t: "h2", text: "Ek achhe kharcha app mein kya-kya hona chahiye" },
      {
        t: "ul",
        items: [
          "**Sub-second entry** — \"chai 20\" likhne se entry ban jani chahiye, 5-field form nahi",
          "**Offline support** — network gaya toh bhi entry honi chahiye; sync baad mein ho jaye",
          "**Udhaar ledger** — kisko diya, kisse liya, kab wapas; yeh hisab sabse pehle chhootta hai",
          "**Monthly budget + category reports** — sirf total nahi, yeh pata hona chahiye paisa KAHAN gaya",
          "**Export** — CSV/JSON kabhi bhi; aapka data aapka hai, app mein locked nahi",
          "**No forced login pehle din** — app 2 minute try karne ke liye account banwana galat hai",
        ],
      },
      {
        t: "callout",
        text: "Sabse bada filter: app ko delete karne ke baad bhi 3 mahine tak use kar rahe ho, toh sahi pakda. Week 3 mein chhoda, toh features kitne bhi achhe hon, bekaar the.",
      },
      { t: "h2", text: "Trackly se kharcha kaise track karein (30 second setup)" },
      {
        t: "ol",
        items: [
          "Safari (iPhone) ya Chrome (Android) mein [trackly.today](https://trackly.today) kholo — app store ki zaroorat nahi, Share → Add to Home Screen se real app jaisa install ho jata hai",
          "Quick Add mein \"chai 20\" type karo — entry ban gayi, amount aur category auto",
          "Hinglish mein bolo ya likho: \"momo 70, biryani 78 add kar do\" — do entries ek saath, reply bhi Hinglish mein",
          "Month mein ek baar budget set karo — category-wise reports khud dikhayenge paisa kahan leak ho raha hai",
        ],
      },
      {
        t: "p",
        text: "Trackly mein expenses akeli nahi hain — udhaar ledger, shopping list (purchased mark karo toh kharcha auto-track), group splitting (flat rent, trips), habits aur tasks sab same app mein. Offline-first hai, bank SMS kuch nahi padhta, aur free tier pe manual entries unlimited hain (AI assistant 30 messages/day). Disclosure: yeh hamara hi app hai, isliye comparison upar honest rakhne ki koshish ki hai — agar zero-effort automation chahiye toh SMS-reading app aapke liye better hai, aur yeh koi burai nahi hai.",
      },
      { t: "h2", text: "Aakhri baat: best app woh hai jo aap use karte raho" },
      {
        t: "p",
        text: "Kharcha tracking ek skill nahi, ek aadat hai — aur aadat ka dushman friction hai. Jo app entry mein sabse kam time lagata hai, wahi jeet-ta hai, chahe uske graphs jitne bhi sundar na hon. Shuru karo aaj ki ek chai se. Teen hafte nikal gaye aur ab bhi log kar rahe ho? Toh app sahi hai. Aur agar [Trackly](/) try karna ho toh [install 30 second mein ho jata hai](/install).",
      },
    ],
    faqs: [
      {
        q: "Kharcha track karne wala sabse best free app kaunsa hai?",
        a: "Yeh aapke style pe depend karta hai: agar zero effort chahiye toh SMS-reading apps (Walnut, Money View) automatic entries banati hain — lekin woh aapke saare messages padhti hain. Privacy ke saath fast entry chahiye toh AI-assisted apps better hain — Trackly (hamara app) mein \"momo 70 rupaye kharcha hua\" jaisa likhne se entry ban jati hai, offline bhi chalta hai, aur koi SMS access nahi. Detail comparison upar table mein hai.",
      },
      {
        q: "Kya kharcha track karna really se paise bachata hai?",
        a: "Haan, lekin wajah jo aap sochte ho woh nahi hai. Data khud paisa nahi bachata — awareness bachata hai. Jab \"is month ₹3,100 sirf food delivery mein gaya\" saaf dikhta hai, toh agli baar order se pehle dimaag khud sawal uthata hai. Isi liye speed sabse important hai: jo app use karna chhod diya, usse koi saving nahi hui.",
      },
      {
        q: "Udhaar (borrow/lend) ka hisab app se kaise rakhein?",
        a: "Har udhaar ko ek ledger entry banao: kisko diya, kitna, due date kab. Partial payments update honi chahiye, delete nahi — Rohit ne ₹1,500 mein se ₹1,000 wapas diya toh balance ₹500 hona chahiye. Trackly mein yeh built-in hai, due dates ke saath; net balance overall dikhata hai ki aap kis side khade ho.",
      },
      {
        q: "Offline kharcha app chahiye ya online wala?",
        a: "Offline-first wala — network ke bina bhi entry ho jaye, sync baad mein ho. Metro mein, basement classroom mein, highway pe — entries tabhi kaam ki hain jab kharcha hua tab likhi jayein, 2 ghante baad nahi. Trackly offline-first PWA hai: bina network entries phone pe save, connection aane pe cloud sync.",
      },
    ],
  },
];

export function getPosts(): BlogPost[] {
  return POSTS;
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
