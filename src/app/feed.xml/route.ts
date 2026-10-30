// RSS 2.0 feed for the Trackly blog — lets RSS readers, feed aggregators
// and blog directories subscribe to new posts, and gives crawlers one
// more structured discovery surface.
//
// Route: GET /feed.xml  (served as application/rss+xml)

import { getPosts } from "@/lib/blog/posts";

const SITE = "https://trackly.today";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const posts = getPosts(); // newest-first order already guaranteed by posts.ts

  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${SITE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${SITE}/blog/${p.slug}</guid>
      <description>${esc(p.description)}</description>
      <pubDate>${new Date(p.datePublished).toUTCString()}</pubDate>
      <category>${esc(p.tagline)}</category>
    </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Trackly Blog — Expense Tracking, Habits &amp; Life-Organization Guides</title>
    <link>${SITE}/blog</link>
    <description>Practical guides from the Trackly team: best expense tracker apps, splitting expenses with roommates, habit building, student budgets and PWA how-tos.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
