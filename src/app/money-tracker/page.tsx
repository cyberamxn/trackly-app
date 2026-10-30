import type { Metadata } from "next";
import KeywordPage from "@/components/seo/KeywordPage";

// Programmatic SEO page targeting: "money tracker", "money tracker app",
// "kharcha tracker", "kharcha track karne wala app", "paise ka hisab app".
// Hinglish-flavored copy — matches how the target audience actually searches.

const TITLE = "Money Tracker — Kharcha, Budget & Udhaar, One Free App";
const DESCRIPTION =
  "Trackly is a free money tracker app: daily kharcha in 5 seconds, monthly budget, udhaar (borrow/lend) ledger, shopping lists and savings — with a Hinglish AI assistant. Offline-first, no bank-SMS access, installs in 30 seconds.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "money tracker",
    "money tracker app",
    "kharcha tracker",
    "kharcha track karne wala app",
    "paise ka hisab app",
    "kharcha manage karne wala app",
  ],
  alternates: {
    canonical: "/money-tracker",
    languages: { "en-IN": "/money-tracker", en: "/money-tracker", "x-default": "/money-tracker" },
  },
  openGraph: {
    type: "website",
    url: "https://trackly.today/money-tracker",
    siteName: "Trackly",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Trackly — Money Tracker App (Kharcha, Budget, Udhaar)" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og-image.png"] },
};

export default function MoneyTrackerPage() {
  return (
    <KeywordPage
      eyebrow="Free · Hinglish AI · Offline-first"
      h1="Money Tracker — Apna Kharcha, Budget Aur Udhaar, Ek App Mein"
      sub={
        "Trackly is a free money tracker for your full financial life: daily kharcha logged in ~5 seconds (type \"chai 20\" or say \"momo 70 rupaye kharcha hua\"), monthly budgets with category-wise reports, an udhaar ledger for paise given or taken, shopping lists and savings goals — all in one offline-first app that never reads your bank SMS."
      }
      chips={[
        "Kharcha entry: ~5 seconds",
        "Udhaar ledger with due dates",
        "Monthly budget + reports",
        "Hinglish AI assistant",
        "Offline-first PWA",
        "Export CSV / JSON",
      ]}
      canonical="/money-tracker"
      description={DESCRIPTION}
      sections={[
        {
          h2: "Paise ka hisab karna mushkil kyun lagta hai — aur kyun nahi hona chahiye",
          ps: [
            "The problem was never the math — it is that traditional hisab happens in three places: kharcha in one app (or a diary), udhaar in your head, and the budget in a spreadsheet nobody opens after January. When the full picture is scattered, month-end always brings the same surprise, and the surprise is never pleasant.",
            "A money tracker earns its keep by putting the whole picture in one place and making the entry fast enough that you actually keep at it. Trackly's bar is simple: writing down a spend should take less time than paying it did. Type \"auto 150\" and it is done; tell the AI \"momo 70 rupaye kharcha hua, add kar do\" in the same Hinglish you think in, and it is done — with the reply in Hinglish too.",
          ],
          callout:
            "Ek app mein kharcha + udhaar + budget. Jab tak poora picture ek jagah nahi hoga, month-end surprise band nahi hoga.",
        },
        {
          h2: "Daily kharcha — 5 second ka rule",
          ps: [
            "UPI ne paisa udana 2-tap bana diya; likhna usse tez hona chahiye. Quick Add parses amount and category automatically, so \"petrol 500\" is a complete entry. Spend a minute at day-end and the whole day is logged; skip a week and the AI's \"aaj kitna kharcha hua?\" still answers from whatever you did log — no guilt screens.",
          ],
          table: {
            head: ["Aap likho / bolo", "Trackly karta hai", "Time"],
            rows: [
              ["\"chai 20\"", "Kharcha saved, category auto", "~3 sec"],
              ["\"momo 70, biryani 78 add kar do\"", "Do entries ek saath", "~4 sec"],
              ["\"aaj kitna kharcha hua?\"", "Aaj ka real total reply mein", "~3 sec"],
              ["\"kisko paise dene hain?\"", "Udhaar ledger se jawab", "~3 sec"],
            ],
          },
        },
        {
          h2: "Monthly budget jo category-wise dikhaye — total ka aadha sach hota hai",
          ps: [
            "\"Is month ₹12,400 nikal gaye\" is information; \"usme ₹3,100 food delivery tha\" is a decision waiting to happen. Set a monthly budget once, and Trackly's day/week/month/year reports break it down by category so the leak is visible while the month can still be saved — not in a post-mortem on the 1st.",
          ],
          ul: [
            "Monthly budget with category-wise breakdown",
            "Daily, weekly, monthly and yearly reports",
            "Budget alerts in the notification center before the month gets away",
          ],
        },
        {
          h2: "Udhaar ka hisab — kisko dena hai, kis se lena hai",
          ps: [
            "Borrow/lend is where most money tracking quietly fails, because udhaar lives in nobody's system. Trackly keeps a proper ledger: lent ₹1,500 to Rohit with a due date, borrowed ₹200 from Priya — each with partial-payment support (Rohit paid ₹1,000 back? The balance updates, not resets). Net balance shows exactly where you stand overall.",
            "When friends are involved beyond one-on-one, the group-split engine handles flat rent, mess bills and trips: add ₹6,000 hotel, split equally, everyone's balance updates live with settle-up suggestions — no end-of-trip spreadsheet session.",
          ],
        },
        {
          h2: "Shopping list se spend tak — ek continuous flow",
          ps: [
            "Real spending starts as an intention (\" headphones chahiye\"), and Trackly connects the whole chain: add it to the shopping list with a price, mark it purchased — it becomes tracked spend automatically, with a return-window reminder so the 14-day window does not silently expire. Money tracking that starts before the payment does.",
          ],
        },
        {
          h2: "Hinglish AI assistant — jaisa sochte ho, waisa likho",
          ps: [
            "The assistant detects your language per message: Roman-script Hinglish in, Hinglish reply out — \"✅ Momo ₹70 add kar diya! Aaj ka kharcha ab ₹148 hai\" — and plain English gets a clean English reply. It acts on your real data (entries, ledger, calendar), which makes it a money assistant rather than a chatbot. Free tier includes 30 AI messages a day; manual entries are unlimited.",
          ],
        },
        {
          h2: "Privacy by design — koi bank SMS access nahi",
          ps: [
            "Automatic SMS-reading apps are convenient and they fund themselves on your messages (OTPs included). Trackly reads nothing automatically — every entry is yours, typed or spoken — so the app needs zero access to your financial messages. Full [expense tracker](/expense-tracker) details, comparisons and the honest trade-off discussion live on the expense tracker page.",
          ],
        },
        {
          h2: "30 second mein start karo",
          ol: [
            "Safari (iPhone) ya Chrome (Android) mein [trackly.today](https://trackly.today) kholo — app store ki zaroorat nahi.",
            "Share → Add to Home Screen (iPhone) ya Install (Android) — real app jaisa install, offline chalega.",
            "\"chai 20\" type karo. Ab aap paise ka hisab track kar rahe ho.",
          ],
          ps: [
            "Free account (email ya Google) se cloud sync on — phone badlo, data wahi milega. Export CSV/JSON kabhi bhi, Settings se.",
          ],
        },
      ]}
      faqs={[
        {
          q: "Trackly money tracker free hai kya?",
          a: "Haan — kharcha tracking, monthly budget, reports, udhaar ledger, shopping lists aur group splitting sab free tier mein hai. App ke andar koi ads nahi, koi trial countdown nahi. Free tier pe AI assistant 30 messages/day limited hai (manual entry unlimited).",
        },
        {
          q: "Kharcha track karne wala app offline chalega?",
          a: "Haan. Trackly offline-first PWA hai — bina network ke kiye gaye entries phone pe save rehte hain aur network aane pe automatically cloud sync ho jaate hain. Browser se home screen pe install hota hai (Safari/Chrome), native app jaisa khulta hai.",
        },
        {
          q: "Kya Trackly mere bank SMS padhta hai?",
          a: "Nahi — yeh design decision hai. Kuch apps automatic tracking ke liye saare messages (OTPs samet) padhti hain; Trackly kuch bhi automatically nahi padhta. Har entry aapki hai — typed ya AI se spoken. Iska trade-off yeh hai ki kuch bhi automatic nahi hota; privacy ke liye yeh theek price hai.",
        },
        {
          q: "Udhaar (borrow/lend) ka hisab kaise rakhta hai?",
          a: "Har udhaar ek ledger entry hai — kisko diya, kisse liya, kitna, due date kab. Partial payment support hai (Rohit ne ₹1,500 mein se ₹1,000 wapas diye? balance update hota hai, entry delete nahi), aur net balance overall dikhata hai ki aap kis side khade ho.",
        },
        {
          q: "Data export kar sakta hoon?",
          a: "Haan — Settings → Export Data se CSV aur JSON dono milte hain. Data kabhi locked nahi hota; account aur saara synced data app se delete bhi kar sakte ho kabhi bhi.",
        },
      ]}
      siblingLinks={[
        { href: "/features", label: "All 40+ Trackly features" },
        { href: "/expense-tracker", label: "Free Expense Tracker" },
        { href: "/habit-tracker", label: "Free Habit Tracker" },
        { href: "/install", label: "Install Trackly" },
        { href: "/blog/what-is-hinglish-ai", label: "What is Hinglish AI?" },
        { href: "/blog/how-to-split-trip-expenses-with-friends", label: "Trip Expenses Split Guide" },
      ]}
    />
  );
}
