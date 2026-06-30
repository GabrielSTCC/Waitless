import type { MetadataRoute } from "next";
import { ALL_SITEMAP_PATHS } from "@/lib/marketing/solutions";
import { getPublicAppBaseUrl } from "@/lib/utils/app-url";

const publicPaths = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/planos", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/privacidade", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/termos", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/cookies", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/canal-lgpd", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/contato", changeFrequency: "monthly" as const, priority: 0.7 },
  ...ALL_SITEMAP_PATHS,
];

function getSitemapBaseUrl(): string {
  const base = getPublicAppBaseUrl() || "https://www.waitless.solutions";
  // Canonical de produção é www; apex redireciona.
  if (base === "https://waitless.solutions") return "https://www.waitless.solutions";
  return base;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSitemapBaseUrl();

  return publicPaths.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
