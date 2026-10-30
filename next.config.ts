import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output sirf self-hosting (local daemon/Docker) ke liye.
  // Vercel par apna runtime use hota hai — wahan standalone ki zaroorat nahi.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
