import type { MetadataRoute } from "next";
import { collections } from "@/lib/photography";
import { site } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/work",
    "/explore",
    "/about",
    "/contact",
    ...collections.map((c) => `/work/${c.slug}`),
  ].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
