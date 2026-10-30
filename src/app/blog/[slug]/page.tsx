import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getPost, getPosts, type Block } from "@/lib/blog/posts";

const SITE = "https://trackly.today";

// ===== Static prerender for every post (fast + fully crawlable) =====
export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
      languages: {
        "en-IN": `/blog/${post.slug}`,
        en: `/blog/${post.slug}`,
        "x-default": `/blog/${post.slug}`,
      },
    },
    openGraph: {
      type: "article",
      url: `${SITE}/blog/${post.slug}`,
      title: `${post.title} · Trackly`,
      description: post.description,
      publishedTime: post.datePublished,
      modifiedTime: post.dateUpdated,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: post.h1 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} · Trackly`,
      description: post.description,
      images: ["/og-image.png"],
    },
  };
}

// ===== Inline [text](href) link parser — content is authored by us =====
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
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
    return <span key={i}>{part}</span>;
  });
}

function renderBlock(b: Block, i: number): ReactNode {
  switch (b.t) {
    case "h2":
      return (
        <h2 key={i} className="text-[24px] sm:text-[28px] font-bold tracking-tight mt-12 mb-4 text-balance">
          {b.text}
        </h2>
      );
    case "h3":
      return (
        <h3 key={i} className="text-[18px] font-bold tracking-tight mt-8 mb-3">
          {b.text}
        </h3>
      );
    case "p":
      return (
        <p key={i} className="text-[15px] sm:text-[16px] leading-[1.75] text-neutral-300 mb-5">
          {renderInline(b.text)}
        </p>
      );
    case "ul":
      return (
        <ul key={i} className="space-y-2.5 mb-6 ml-1">
          {b.items.map((it, j) => (
            <li key={j} className="text-[15px] leading-[1.7] text-neutral-300 flex gap-3">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full bg-neutral-500 shrink-0" />
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={i} className="space-y-2.5 mb-6 ml-1">
          {b.items.map((it, j) => (
            <li key={j} className="text-[15px] leading-[1.7] text-neutral-300 flex gap-3">
              <span className="text-[13px] font-bold text-neutral-500 shrink-0 mt-0.5 tabular-nums">
                {String(j + 1).padStart(2, "0")}
              </span>
              <span>{renderInline(it)}</span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div key={i} className="rounded-2xl border border-neutral-700 bg-neutral-900/60 p-5 my-7">
          <p className="text-[14px] sm:text-[15px] leading-relaxed text-neutral-200 font-medium">
            {renderInline(b.text)}
          </p>
        </div>
      );
    case "table":
      return (
        <div key={i} className="overflow-x-auto my-7 rounded-2xl border border-neutral-800">
          <table className="w-full text-[13px] sm:text-[14px]">
            <thead>
              <tr className="bg-neutral-900">
                {b.head.map((h, j) => (
                  <th key={j} className="text-left font-bold px-4 py-3 border-b border-neutral-800 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, j) => (
                <tr key={j} className="odd:bg-neutral-950 even:bg-black">
                  {row.map((cell, k) => (
                    <td key={k} className="px-4 py-3 text-neutral-300 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getPosts().filter((p) => p.slug !== post.slug).slice(0, 3);

  // ===== JSON-LD: Article + FAQPage + BreadcrumbList =====
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.h1,
    description: post.description,
    datePublished: post.datePublished,
    dateModified: post.dateUpdated,
    inLanguage: "en",
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${post.slug}` },
    image: `${SITE}/og-image.png`,
    author: { "@type": "Organization", name: "Trackly Team", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "ahexa.studio",
    },
    keywords: post.keywords.join(", "),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.h1, item: `${SITE}/blog/${post.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

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
            <Link href="/blog" className="px-3 h-9 inline-flex items-center rounded-full border border-neutral-800 text-neutral-300 hover:border-neutral-600 transition-colors">
              Blog
            </Link>
            <Link href="/app" className="px-4 h-9 inline-flex items-center rounded-full bg-white text-black font-semibold hover:scale-[1.03] transition-transform">
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-3xl mx-auto px-5 pt-6">
        <ol className="flex items-center gap-2 text-[12px] text-neutral-500">
          <li><Link href="/" className="hover:text-neutral-300 transition-colors">Home</Link></li>
          <li>/</li>
          <li><Link href="/blog" className="hover:text-neutral-300 transition-colors">Blog</Link></li>
          <li>/</li>
          <li className="text-neutral-300 truncate max-w-[200px] sm:max-w-none">{post.title}</li>
        </ol>
      </nav>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-5 pt-8 pb-14">
        <p className="text-[11px] uppercase tracking-widest text-neutral-500 font-semibold">{post.tagline}</p>
        <h1 className="text-[30px] sm:text-[40px] font-bold tracking-tight leading-[1.1] mt-2 text-balance">
          {post.h1}
        </h1>
        <p className="text-[15px] sm:text-[16px] text-neutral-400 mt-4 leading-relaxed">{post.description}</p>
        <p className="text-[12px] text-neutral-500 mt-5">
          Trackly Team · {formatDate(post.datePublished)} · {post.readingMinutes} min read
        </p>

        <div className="mt-8">{post.blocks.map(renderBlock)}</div>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {post.faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-neutral-800 bg-neutral-950"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-5 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[16px] font-bold tracking-tight">{f.q}</h3>
                  <span className="text-neutral-500 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="px-6 pb-5 -mt-1 text-[14px] leading-relaxed text-neutral-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-3xl bg-white text-black p-8 sm:p-10 text-center">
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight">Try Trackly — it&apos;s free.</h2>
          <p className="text-[14px] text-neutral-600 mt-2">
            Expenses, habits, tasks, notes and group splitting — one app, works offline, installs in 30 seconds.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap mt-6">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-black text-white text-[14px] font-bold hover:scale-[1.03] transition-transform"
            >
              Open the App
            </Link>
            <Link
              href="/install"
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full border border-neutral-300 text-black text-[14px] font-semibold hover:border-black transition-colors"
            >
              How to install
            </Link>
          </div>
        </section>

        {/* Related */}
        <section className="mt-14">
          <h2 className="text-[20px] font-bold tracking-tight mb-5">Keep reading</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-5 hover:border-neutral-600 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">{r.tagline}</p>
                <p className="text-[14px] font-bold tracking-tight mt-2 group-hover:underline underline-offset-4">
                  {r.h1}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </article>

      {/* Footer */}
      <footer className="border-t border-neutral-800 px-5 py-8">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-neutral-500">
          <span>© 2026 ahexa.studio. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/app" className="hover:text-white transition-colors">Open app</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
