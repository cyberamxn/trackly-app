import type { SyncedConfig, SyncedNotification } from "@/lib/trackly/sync";

export const DEMO_CONFIG: SyncedConfig = {
  app_name: "Trackly",
  app_version: "2.4.1",
  company_name: "ahexa.studio",
  company_address: "Purnea, Bihar, India",
  company_website: "https://ahexa.studio",
  support_email: "amanatalibaisi786@gmail.com",
  support_phone: "+91 98765 43210",
  support_response_time: "Within 24 hours",
  help_response_hours: 24,
  help_website: "https://ahexa.studio",
  help_intro_en: "Trackly is your all-in-one life tracker — expenses, habits, routines, notes, shopping, borrow/lend, calendar and student mode all in one place.",
  help_intro_hi: "Trackly aapka all-in-one life tracker hai — expenses, habits, routine, notes, shopping, borrow/lend, calendar aur student mode sab ek hi jagah.",
  social_instagram: "trackly.in",
  social_twitter: "",
  social_youtube: "",
  social_facebook: "",
  privacy_updated_at: "2026-08-01",
  terms_updated_at: "2026-08-01",
  announcement_banner: { text: "", active: false },
  maintenance_mode: false,
  whats_new: {
    version: "v2.4.1",
    title: "What's New in Trackly",
    active: true,
    updated_at: "2026-08-01",
    items: [
      "Trip Mode — automatic currency conversion for national & international trips",
      "Student Mode — attendance, assignments, exams, hostel rent, mess planner, AI study assistant",
      "Office Mode — work tasks, meetings, attendance, salary & productivity tracker",
      "Quick Add — natural language expense tracking (type 'Coffee 280')",
      "Hinglish language support — Settings → Language → Hinglish",
      "Help & Support screen — bilingual how-to articles + FAQs + contact options",
      "Privacy Policy updated for Indian DPDP Act 2023 + GDPR + CCPA compliance",
      "Bug fixes and performance improvements",
    ],
  },
};

export const DEMO_NOTIFICATIONS: SyncedNotification[] = [];

export const DEMO_CONTENT: Record<string, any[]> = {
  HELP_ARTICLE: [
    { id: "d-h1", title: "Getting Started — Pehla Step", body: "Trackly install karne ke baad pehle onboarding complete karein. Aapse naam, email, currency aur language puchi jayegi.", metadata: { icon: "sparkles", sortOrder: 0, category: "Basics" } },
    { id: "d-h2", title: "Expenses Track Karna", body: "Dashboard pe + button se ya Quick Add se expense add karein. Type karein 'Coffee 280' — Trackly automatically amount aur category detect kar lega.", metadata: { icon: "wallet", sortOrder: 1, category: "Expenses" } },
    { id: "d-h3", title: "Habits Build Karna", body: "Habits screen mein + button se naya habit add karein — naam, icon, daily goal aur unit.", metadata: { icon: "repeat", sortOrder: 2, category: "Habits" } },
    { id: "d-h4", title: "Office Mode Use Karna", body: "Settings > Office Mode toggle karein. Dashboard change ho jayega — Work Tasks, Meetings, Attendance, Salary & Productivity sab kuch ek jagah.", metadata: { icon: "briefcase", sortOrder: 3, category: "Office" } },
  ],
  FAQ: [
    { id: "d-f1", title: "How do I add an expense?", body: "Dashboard pe + button tap karein, ya Quick Add use karein. 'Coffee 280' type karte hi Trackly automatically amount aur category detect kar lega.", metadata: { sortOrder: 0 } },
    { id: "d-f2", title: "Kya mera data secure hai?", body: "Haan. Hum on-device encryption use karte hain aur optional Face ID / biometric lock provide karte hain.", metadata: { sortOrder: 1 } },
    { id: "d-f3", title: "Office Mode kya hai?", body: "Office Mode dashboard ko redesign kar deta hai — work tasks, meetings, attendance, salary, productivity aur analytics sab kuch ek jagah.", metadata: { sortOrder: 2 } },
  ],
  PRIVACY: [
    {
      id: "d-p1", type: "PRIVACY", title: "Privacy Policy",
      body: `Trackly Privacy Policy\n\nLast updated: 2026-08-01\n\nahexa.studio respects your privacy. This policy complies with Indian DPDP Act 2023, GDPR, and CCPA.\n\n1. DATA WE COLLECT\nName, email, expenses, habits, notes — data you log.\n\n2. HOW WE USE YOUR DATA\nCore app functionality, notifications, support. We do NOT sell your data.\n\n3. YOUR RIGHTS\nAccess, correction, erasure, grievance redressal per DPDP Act.\n\n4. CONTACT\nEmail: amanatalibaisi786@gmail.com\nCompany: ahexa.studio, Purnea, Bihar, India`,
      metadata: { version: "1.0", effectiveDate: "2026-08-01" },
    },
  ],
  TERMS: [
    {
      id: "d-t1", type: "TERMS", title: "Terms & Conditions",
      body: `Trackly Terms of Service\n\nLast updated: 2026-08-01\n\n1. ACCEPTANCE OF TERMS\nYou must be 13+ to use the App.\n\n2. GOVERNING LAW\nLaws of India. Courts at Purnea, Bihar.\n\n3. CONTACT\nEmail: amanatalibaisi786@gmail.com`,
      metadata: { version: "1.0", effectiveDate: "2026-08-01" },
    },
  ],
};

export const DEMO_CATEGORIES = ["Food", "Fuel", "Rent", "EMI", "Grocery", "Shopping", "Bills", "Travel", "Entertainment", "Healthcare", "Education", "Others"];
export const DEMO_REFERRAL_LINK = "https://trackly.app/r/demo";
export const DEMO_PLANS: any[] = [];
export const DEMO_COUPONS: any[] = [];
export const DEMO_FEATURE_FLAGS: any[] = [];
export const DEMO_SETTINGS: Record<string, string> = { website_referral_link: DEMO_REFERRAL_LINK };
