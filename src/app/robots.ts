import type { MetadataRoute } from "next";
import { getPublicAppBaseUrl } from "@/lib/utils/app-url";

export default function robots(): MetadataRoute.Robots {
  const base =
    getPublicAppBaseUrl() === "https://waitless.solutions"
      ? "https://www.waitless.solutions"
      : getPublicAppBaseUrl() || "https://www.waitless.solutions";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/q/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
