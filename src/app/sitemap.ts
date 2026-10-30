import type { MetadataRoute } from "next";
import { POSTS } from "@/lib/blog/posts";

// Public, indexable pages only. /app is noindex (auth-gated PWA shell),
// /demo is a redirect, /6207 (admin) & /reset-password are robots-blocked.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://trackly.today";
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/features`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/expense-tracker`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/habit-tracker`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/money-tracker`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/install`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...POSTS.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.dateUpdated),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
