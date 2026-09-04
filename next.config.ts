import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fail the build on a type error rather than shipping a broken deploy.
  // Next 16 removed `next lint`, so ESLint runs as its own step in `pnpm verify`.
  typescript: { ignoreBuildErrors: false },

  // Trim the response surface. `x-powered-by` tells an attacker the stack for free.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking. The site is never legitimately framed.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the origin cross-site, the full URL same-site. Keeps our own
          // attribution working without leaking paths to third parties.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        // Belt and braces with the route-level noindex on the admin layout.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
