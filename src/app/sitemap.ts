import type { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo-config";
import { seoSitemapEntries } from "@/lib/seo-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getSeoConfig();
  if (!config.indexable || !config.origin) return [];
  return [
    { url: config.origin, changeFrequency: "monthly", priority: 1 },
    ...seoSitemapEntries(config),
  ];
}
