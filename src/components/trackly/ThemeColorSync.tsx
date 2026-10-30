"use client";

import { useEffect } from "react";

/**
 * Forces the browser's theme-color meta tag to PURE BLACK (#000000) at all times.
 *
 * This ensures the iOS status bar area is always black — matching Trackly's
 * pure black app design. Works in both light and dark app themes.
 *
 * Status-bar style is forced to "black" (solid black zone, webview stays
 * inset below it — the original app size). "black-translucent" is only
 * correct when the viewport covers the whole screen (viewport-fit=cover),
 * which we no longer use.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const BLACK = "#000000";

    const metas = document.querySelectorAll('meta[name="theme-color"]') as NodeListOf<HTMLMetaElement>;
    metas.forEach((m) => {
      m.content = BLACK;
      m.removeAttribute("media");
    });

    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement | null;
    if (!appleMeta) {
      appleMeta = document.createElement("meta");
      appleMeta.name = "apple-mobile-web-app-status-bar-style";
      document.head.appendChild(appleMeta);
    }
    appleMeta.content = "black";
  }, []);

  return null;
}
