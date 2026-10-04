import type { MetadataRoute } from "next";
import { getSeoConfig } from "@/lib/seo-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getSeoConfig();
  if (!config.indexable || !config.origin) return [];
  return [{ url: config.origin, changeFrequency: "monthly", priority: 1 }];
}
