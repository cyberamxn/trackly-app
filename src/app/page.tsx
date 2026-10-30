import type { Metadata } from "next";
import LandingClient from "@/components/trackly/landing/LandingClient";
import {
  DEFAULT_FEATURES,
  FAQS,
  type LandingConfig,
} from "@/components/trackly/landing/landingShared";

// ===== Site constants =====
const SITE = "https://trackly.today";
const TITLE = "Trackly — Free Expense, Habit & Life Tracker App";
const DESCRIPTION =
  "Free all-in-one life tracker: expenses, budgets, habits, tasks, routines, notes, shopping lists, borrow/lend and group expenses — with an AI assistant, student & office modes. Offline-first PWA, installs in 30 seconds.";
const OG_IMAGE = "/og-image.png";

// ===== SSR defaults — rendered into the raw HTML for crawlers =====
// (GPTBot/ClaudeBot/PerplexityBot don't run JavaScript; this static content
// is what they — and Google's first-pass indexer — actually read. Admin
// panel config fetched client-side overrides only the keys it defines.)
const DEFAULT_CONFIG: LandingConfig = {
  tagline: "Premium Daily Life Tracker",
  hero_title: "One app for your whole life.",
  hero_subtitle:
    "Expenses, shopping, habits, routines, notes, reminders & analytics — unified in a pure black & white, distraction-free interface.",
  cta_text: "Download Trackly",
  ios_url: "https://trackly.today/install",
  // Placeholder Play Store listing doesn't exist (no native app yet) — the
  // honest default is the install guide. Admin config overrides when native
  // apps ship.
  android_url: "https://trackly.today/install",
  features: DEFAULT_FEATURES,
  footer_text: "by ahexa.studio · © 2026. All rights reserved.",
};

// ===== Metadata (title/description + OG + Twitter + canonical) =====
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
    // hreflang: single-language site, this page's own URL for each tag
    languages: { "en-IN": "/", en: "/", "x-default": "/" },
  },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Trackly",
    title: "Trackly — One app for your whole life",
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Trackly — One app for your whole life" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trackly — One app for your whole life",
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// ===== JSON-LD structured data (answer engines & rich results) =====
// FAQPage mirrors the visible FAQ section exactly (Google guideline).
const MAKER = { "@type": "Organization", name: "ahexa.studio", url: `${SITE}/about` };

const softwareAppLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Trackly",
  url: SITE,
  description: DESCRIPTION,
  applicationCategory: ["ProductivityApplication", "FinanceApplication", "LifestyleApplication"],
  operatingSystem: "Web, iOS, Android",
  browserRequirements: "Requires JavaScript",
  isAccessibleForFree: true,
  inLanguage: "en",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  featureList: DEFAULT_FEATURES.map((f) => `${f.title}: ${f.description}`),
  creator: MAKER,
  author: MAKER,
  publisher: MAKER,
};

const organizationLd = {
  "@context": "https://schema.org",
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
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Trackly",
  url: SITE,
  description: DESCRIPTION,
  publisher: MAKER,
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <LandingClient initialConfig={DEFAULT_CONFIG} />
    </>
  );
}
