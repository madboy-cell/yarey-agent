import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // ── BUILD PERFORMANCE ──────────────────────────────────────────────
  // Keep heavy client-only packages external to speed up SSR bundling.
  // NOTE: "firebase" was removed — it MUST be bundled for SSR Cloud Functions
  // or it will crash with "Cannot find package 'firebase-xxx'" in Cloud Run.
  serverExternalPackages: [
    "jspdf",
    "jspdf-autotable",
    "html2canvas",
  ],

  // Tree-shake client-side imports so only used exports are bundled
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "recharts",
      "@google/generative-ai",
    ],
  },
};

export default nextConfig;

