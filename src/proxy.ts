import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Lightweight origin logger — kisi bhi page request pe host/origin console
 * me log hota hai (dev.log). OAuth redirect debugging ke liye: user jab bhi
 * app kholta hai, uska actual preview domain dev.log me dikh jata hai.
 *
 * Next.js 16: middleware.ts → proxy.ts convention migrate kar diya gaya
 * (function bhi `middleware` se `proxy` rename). Behaviour bilkul same.
 *
 * No response modification — sirf observe karta hai.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("host") || "";
  // Sirf non-localhost (ya localhost bhi — full picture) ek hi baar per path
  const path = req.nextUrl.pathname;
  if (path === "/" || path.startsWith("/api/public")) {
    console.log(`[ORIGIN] host=${host} path=${path}`);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
