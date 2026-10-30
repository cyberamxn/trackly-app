import Link from "next/link";
import type { ReactNode } from "react";

// ============================================================
// KeywordPage — server-rendered SEO landing page shell for
// programmatic keyword pages (/expense-tracker, /habit-tracker,
// /money-tracker). 100% static content (no client JS) so search
// engines AND no-JS AI crawlers (GPTBot/ClaudeBot/PerplexityBot)
// read everything. Dark, pure black&white — matches site design.
// ============================================================

export interface KFaq {
  q: string;
  a: string;
}

export interface KSection {
  h2?: string;
  h3?: string;
  ps?: string[];
  ul?: string[];
  ol?: string[];
  table?: { head: string[]; rows: string[][] };
  callout?: string;
}

export interface KeywordPageProps {
  eyebrow: string; // chip above H1 — "Free · Offline-first · No sign-up"
  h1: string;
  sub: string; // answer-first lead paragraph (AEO — 50-80 words, direct answer first)
  chips: string[]; // quick-facts row under the lead
  sections: KSection[];
  faqs: KFaq[];
  canonical: string; // "/expense-tracker"
  description: string; // meta description (also used in JSON-LD)
  siblingLinks: { href: string; label: string }[]; // cross-links to the other keyword pages
}

const SITE = "https://trackly.today";

// ===== Inline [text](href) link + **bold** parser — content authored by us =====
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      const [, label, href] = m;
      const external = href.startsWith("http");
      return (
        <a
          key={i}
          href={href}
          className="underline underline-offset-4 hover:opacity-70 transition-opacity"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>
      );
    }
    const b = part.match(/^\*\*([^*]+)\*\*$/);
    if (b) {
      return (
        <strong key={i} className="font-semibold text-white">
          {b[1]}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function SectionBlock({ s, i }: { s: KSection; i: number }) {
  return (
    <section key={i}>
      {s.h2 && (
        <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight mt-12 mb-4 text-balance">
          {s.h2}
        </h2>
      )}
      {s.h3 && <h3 className="text-[18px] font-bold tracking-tight mt-8 mb-3">{s.h3}</h3>}
      {s.ps?.map((p, j) => (
        <p key={j} className="text-[15px] sm:text-[16px] leading-[1.75] text-neutral-300 mb-5">
          {renderInline(p)}
        </p>
      ))}
      {s.ul && (
        <ul className="space-y-2.5 mb-6 ml-1">
          {s.ul.map((it, j) => (
            <li key={j} className="text-[15px] leading-[1.7] text-neutral-300 flex gap-3">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-neutral-500 shrink-0" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      )}
      {s.ol && (
        <ol className="space-y-2.5 mb-6 ml-1">
          {s.ol.map((it, j) => (
            <li key={j} className="text-[15px] leading-[1.7] text-neutral-300 flex gap-3">
              <span className="font-bold shrink-0">{j + 1}.</span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      )}
      {s.table && (
        <div className="overflow-x-auto my-6 rounded-xl border border-neutral-800">
          <table className="w-full text-[13.5px] sm:text-[14px]">
            <thead>
              <tr className="bg-neutral-900/60">
                {s.table.head.map((h, j) => (
                  <th key={j} className="text-left font-bold px-4 py-3 border-b border-neutral-800 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.table.rows.map((row, j) => (
                <tr key={j} className="border-b border-neutral-900 last:border-0">
                  {row.map((c, k) => (
                    <td key={k} className="px-4 py-3 text-neutral-300 align-top">
                      {renderInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {s.callout && (
        <div className="my-6 rounded-xl border border-neutral-700 bg-neutral-900/50 px-5 py-4 text-[14.5px] leading-[1.7] text-neutral-200">
          {renderInline(s.callout)}
        </div>
      )}
    </section>
  );
}

export default function KeywordPage({
  eyebrow,
  h1,
  sub,
  chips,
  sections,
  faqs,
  canonical,
  description,
  siblingLinks,
}: KeywordPageProps) {
  const fullUrl = `${SITE}${canonical}`;

  // ===== JSON-LD (answer engines & rich results) =====
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const appLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Trackly",
    url: SITE,
    description,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web, iOS, Android",
    isAccessibleForFree: true,
    inLanguage: "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    creator: { "@type": "Organization", name: "ahexa.studio", url: `${SITE}/about` },
    author: { "@type": "Organization", name: "ahexa.studio", url: `${SITE}/about` },
    publisher: { "@type": "Organization", name: "ahexa.studio", url: `${SITE}/about` },
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: h1, item: fullUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Header */}
      <header className="border-b border-neutral-900">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-[17px] tracking-tight">
            Trackly
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-neutral-400">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link
              href="/install"
              className="bg-white text-black font-semibold px-3.5 py-1.5 rounded-full hover:opacity-85 transition-opacity"
            >
              Install App
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-20">
        {/* Hero */}
        <div className="pt-12 sm:pt-16 pb-2">
          <span className="inline-block text-[12px] font-semibold tracking-wide uppercase text-neutral-400 border border-neutral-800 rounded-full px-3 py-1 mb-5">
            {eyebrow}
          </span>
          <h1 className="text-[34px] sm:text-[46px] font-bold leading-[1.1] tracking-tight text-balance">
            {h1}
          </h1>
          <p className="mt-5 text-[17px] sm:text-[18px] leading-[1.7] text-neutral-300">{renderInline(sub)}</p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/install"
              className="bg-white text-black font-semibold px-6 py-3 rounded-full text-[15px] hover:opacity-85 transition-opacity"
            >
              Install Free — 30 seconds
            </Link>
            <Link
              href="/"
              className="border border-neutral-700 font-semibold px-6 py-3 rounded-full text-[15px] hover:border-neutral-400 transition-colors"
            >
              See all features
            </Link>
          </div>

          {/* Quick-fact chips */}
          <div className="mt-7 flex flex-wrap gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="text-[12.5px] font-medium text-neutral-300 border border-neutral-800 bg-neutral-900/40 rounded-full px-3 py-1.5"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Content sections */}
        <article>
          {sections.map((s, i) => (
            <SectionBlock key={i} s={s} i={i} />
          ))}
        </article>

        {/* FAQ */}
        <section>
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight mt-12 mb-5">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-neutral-800 bg-neutral-900/30 px-5 py-4 open:bg-neutral-900/50 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none text-[15.5px] font-semibold">
                  {f.q}
                  <span className="text-neutral-500 group-open:rotate-45 transition-transform text-[18px] leading-none ml-3 shrink-0">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14.5px] leading-[1.7] text-neutral-300">{renderInline(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-14 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-6 sm:px-10 py-10 text-center">
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight text-balance">
            Start tracking today — free
          </h2>
          <p className="mt-3 text-[15px] leading-[1.7] text-neutral-300">
            No sign-up walls, no ads inside the app, works offline. Installs like a real app on iPhone and Android.
          </p>
          <Link
            href="/install"
            className="inline-block mt-6 bg-white text-black font-semibold px-7 py-3 rounded-full text-[15px] hover:opacity-85 transition-opacity"
          >
            Install Trackly — Free
          </Link>
        </section>

        {/* Sibling keyword pages (internal linking) */}
        <nav className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-neutral-400">
          {siblingLinks.map((l) => (
            <Link key={l.href} href={l.href} className="underline underline-offset-4 hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
      </main>

      <footer className="border-t border-neutral-900">
        <div className="max-w-3xl mx-auto px-5 py-8 text-[13px] text-neutral-500 flex flex-wrap gap-x-5 gap-y-2">
          <span>Trackly by ahexa.studio · © 2026</span>
          <Link href="/" className="hover:text-neutral-300 transition-colors">
            Home
          </Link>
          <Link href="/features" className="hover:text-neutral-300 transition-colors">
            Features
          </Link>
          <Link href="/about" className="hover:text-neutral-300 transition-colors">
            About
          </Link>
          <Link href="/privacy" className="hover:text-neutral-300 transition-colors">
            Privacy
          </Link>
          <Link href="/install" className="hover:text-neutral-300 transition-colors">
            Install
          </Link>
          <Link href="/blog" className="hover:text-neutral-300 transition-colors">
            Blog
          </Link>
        </div>
      </footer>
    </div>
  );
}
