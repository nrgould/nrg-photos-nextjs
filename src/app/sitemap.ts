import type { MetadataRoute } from "next";
import { collections } from "@/lib/photography";
import { getSeoConfig } from "@/lib/seo-config";
import { seoSitemapEntries } from "@/lib/seo-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const config = getSeoConfig();
  if (!config.indexable || !config.origin) return [];
  const pages: MetadataRoute.Sitemap = [
    "",
    "/work",
    "/explore",
    "/presets",
    "/about",
    "/contact",
    ...collections.map((collection) => `/work/${collection.slug}`),
  ].map((path) => ({
    url: `${config.origin}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
  return [...pages, ...seoSitemapEntries(config)];
}
