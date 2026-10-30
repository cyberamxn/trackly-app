import { redirect } from "next/navigation";

// The marketing/demo landing page now lives at the site root (trackly.today).
// The real app moved to /app. Old /demo links (and Supabase OAuth Site-URL
// fallbacks that point here) are forwarded to the landing page — the global
// AuthProvider routeAuthCallback then moves signed-in users into /app.
export default function DemoRedirect() {
  redirect("/");
}
