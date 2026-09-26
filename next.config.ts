import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // ESLint ayrı çalışır; sahne build'i lint yüzünden durmasın.
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "solc"],
  experimental: {
    optimizePackageImports: ["@react-three/drei", "motion"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
