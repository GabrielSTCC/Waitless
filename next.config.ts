import type { NextConfig } from "next";
import path from "path";
import { getHttpSecurityHeaders } from "./security-headers";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "jwks-rsa",
    "jose",
  ],
  transpilePackages: ["three"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/v0/b/**",
      },
    ],
  },
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    const securityHeaders = getHttpSecurityHeaders();

    return [
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "text/xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=86400" },
          ...securityHeaders,
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=86400" },
          ...securityHeaders,
        ],
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
