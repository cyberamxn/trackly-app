"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * IOSViewportFix — iOS PWA tap-offset / keyboard bug workaround.
 *
 * PROBLEM (reported on iPhone, installed PWA):
 * After the on-screen keyboard opens (AI chat / any input) and closes,
 * taps start registering a few inches BELOW where the finger actually is.
 * This is a known WKWebView standalone-mode bug: when the visual viewport
 * resizes (keyboard) iOS sometimes leaves the layout viewport internally
 * scrolled/offset, and touch hit-testing keeps using the stale offset.
 *
 * FIX: whenever the visual viewport changes size and NO input is focused
 * (i.e. the keyboard just closed), force the page back to a clean anchor:
 * window/document scroll reset to (0,0). The /app shell uses `fixed inset-0`
 * + inner scroll containers, so the window itself must always stay at (0,0).
 * Re-anchoring it makes hit-testing line up with what is on screen again.
 *
 * ROUTE-GATED (important): this re-anchor listens to visualViewport "scroll"
 * and snaps window back to (0,0). On document-flow pages (landing/demo,
 * /install, admin) that very behavior KILLS page scrolling — every scroll
 * gesture gets yanked back to the top. So the fix is active ONLY on /app
 * routes, where the fixed shell lives.
 *
 * It also owns the html.app-lock class (globals.css): /app locks document
 * scroll (fixed shell + inner containers), every other page scrolls
 * normally as a document.
 */
export function IOSViewportFix() {
  const pathname = usePathname() || "/";
  // Active only inside the app shell. /app/** covers the auth bridge etc.
  const active = pathname === "/app" || pathname.startsWith("/app/");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const keyboardLikelyOpen = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const reanchor = () => {
      if (keyboardLikelyOpen()) return;
      try {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {}
    };

    const vv = window.visualViewport;
    const onVVResize = () => {
      // small delay lets iOS finish its internal layout pass first
      window.setTimeout(reanchor, 80);
    };
    const onFocusOut = () => window.setTimeout(reanchor, 120);
    const onOrientation = () => window.setTimeout(reanchor, 350);

    if (!active) return;

    // Lock document scroll for the fixed shell (globals.css rule).
    document.documentElement.classList.add("app-lock");

    vv?.addEventListener("resize", onVVResize);
    vv?.addEventListener("scroll", onVVResize);
    window.addEventListener("focusout", onFocusOut);
    window.addEventListener("orientationchange", onOrientation);

    return () => {
      document.documentElement.classList.remove("app-lock");
      vv?.removeEventListener("resize", onVVResize);
      vv?.removeEventListener("scroll", onVVResize);
      window.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [active]);

  return null;
}
