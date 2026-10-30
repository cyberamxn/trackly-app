import type { Metadata } from "next";
import Link from "next/link";
import { getPosts } from "@/lib/blog/posts";

const SITE = "https://trackly.today";

export const metadata: Metadata = {
  title: "Blog — Expense Tracking, Habits & Life-Organization Guides",
  description:
    "Practical guides from the Trackly team: best expense tracker apps, splitting expenses with roommates, habit building, student budgets and PWA how-tos.",
  alternates: {
    canonical: "/blog",
    languages: { "en-IN": "/blog", en: "/blog", "x-default": "/blog" },
    types: { "application/rss+xml": `${SITE}/feed.xml` },
  },
  openGraph: {
    type: "website",
    url: `${SITE}/blog`,
    title: "Trackly Blog — Expense Tracking, Habits & Life-Organization Guides",
    description:
      "Practical guides from the Trackly team: best expense tracker apps, splitting expenses with roommates, habit building, student budgets and PWA how-tos.",
  },
};

const blogLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Trackly Blog",
  url: `${SITE}/blog`,
  description:
    "Practical guides on expense tracking, habit building, student budgets and group expenses from the Trackly team.",
  publisher: { "@type": "Organization", name: "ahexa.studio" },
  blogPost: getPosts().map((p) => ({
    "@type": "BlogPosting",
    headline: p.h1,
    description: p.description,
    datePublished: p.datePublished,
    dateModified: p.dateUpdated,
    url: `${SITE}/blog/${p.slug}`,
  })),
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = getPosts();
  return (
    <div className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogLd) }}
      />

      {/* Header */}
      <header className="border-b border-neutral-800/60 sticky top-0 z-30 bg-black/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-white flex items-center justify-center">
              <div className="h-4.5 w-4.5 rounded-full border-2 border-black flex items-center justify-center">
                <div className="h-1 w-1 rounded-full bg-black" />
              </div>
            </div>
            <span className="text-[18px] font-bold tracking-tight">Trackly</span>
          </Link>
          <div className="flex items-center gap-2 text-[13px]">
            <Link href="/" className="px-3 h-9 inline-flex items-center rounded-full border border-neutral-800 text-neutral-300 hover:border-neutral-600 transition-colors">
              Home
            </Link>
            <Link href="/app" className="px-4 h-9 inline-flex items-center rounded-full bg-white text-black font-semibold hover:scale-[1.03] transition-transform">
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-14 pb-10">
        <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold mb-3">Trackly Blog</p>
        <h1 className="text-[36px] sm:text-[44px] font-bold tracking-tight leading-[1.05]">
          Guides for a more organized life.
        </h1>
        <p className="text-[15px] sm:text-[16px] text-neutral-400 mt-4 leading-relaxed max-w-xl">
          Expense tracking, habit building, student budgets, splitting bills with roommates — practical, honest guides from the team behind Trackly.
        </p>
      </section>

      {/* Post list */}
      <section className="max-w-3xl mx-auto px-5 pb-20">
        <div className="space-y-4">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group block rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 hover:border-neutral-600 transition-colors"
            >
              <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold">{p.tagline}</p>
              <h2 className="text-[20px] sm:text-[24px] font-bold tracking-tight mt-2 group-hover:underline underline-offset-4">
                {p.h1}
              </h2>
              <p className="text-[14px] text-neutral-400 mt-3 leading-relaxed">{p.description}</p>
              <p className="text-[12px] text-neutral-500 mt-4">
                {formatDate(p.datePublished)} · {p.readingMinutes} min read
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-5 pb-20">
        <div className="rounded-3xl bg-white text-black p-8 sm:p-10 text-center">
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight">Put the guides into practice.</h2>
          <p className="text-[14px] text-neutral-600 mt-2">
            Trackly is free — expenses, habits, tasks, notes and group splitting in one app.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 mt-6 h-12 px-7 rounded-full bg-black text-white text-[14px] font-bold hover:scale-[1.03] transition-transform"
          >
            Open the App — it&apos;s free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-5 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-500">
          <span>© 2026 ahexa.studio. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/install" className="hover:text-white transition-colors">Install</Link>
            <Link href="/app" className="hover:text-white transition-colors">Open app</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
