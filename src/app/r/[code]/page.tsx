import { redirect } from "next/navigation";

// /r/CODE — invite short link. Zero-DB redirect: stores nothing, renders
// nothing; the landing page's <RefCapture /> persists ?ref=CODE and greets
// the visitor with the referrer's name (via /api/referrals/validate).
// Format-gate only — junk codes still bounce to "/" (no enumeration).
export default async function ReferralRoute({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = decodeURIComponent(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length >= 4 && clean.length <= 12) {
    redirect(`/?ref=${clean}`);
  }
  redirect("/");
}
