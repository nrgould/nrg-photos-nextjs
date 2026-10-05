import type { Metadata, MetadataRoute } from "next";

export type SeoConfig = Readonly<{ indexable: boolean; origin: string | null }>;
export type SeoEnvironment = Readonly<Record<string, string | undefined>>;

function httpsOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.hostname === "localhost" ||
      !url.hostname.includes(".")
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Explicit launch opt-in. A Vercel preview can never opt into indexing. */
export function getSeoConfig(env: SeoEnvironment = process.env): SeoConfig {
  const canonical = httpsOrigin(env.SEO_CANONICAL_ORIGIN);
  const indexable =
    env.SEO_LAUNCH_INDEXING === "true" &&
    env.VERCEL_ENV === "production" &&
    canonical !== null;
  return {
    indexable,
    origin: indexable ? canonical : httpsOrigin(env.SEO_PUBLIC_ORIGIN),
  };
}

export function seoUrl(path: string, config: SeoConfig): string | undefined {
  if (!config.origin || !path.startsWith("/") || path.startsWith("//"))
    return undefined;
  return new URL(path, config.origin).href;
}

export function seoRobotsMetadata(config = getSeoConfig()): Metadata["robots"] {
  return {
    index: config.indexable,
    follow: config.indexable,
    googleBot: {
      index: config.indexable,
      follow: config.indexable,
      "max-image-preview": "large",
    },
  };
}

/** Root integration may retain its existing legacy canonical until launch. */
export function seoLaunchMetadata(config = getSeoConfig()): Metadata {
  return {
    robots: seoRobotsMetadata(config),
    ...(config.indexable && config.origin
      ? { metadataBase: new URL(config.origin) }
      : {}),
  };
}

export function seoRobotsFile(config = getSeoConfig()): MetadataRoute.Robots {
  // Permit retrieval of the noindex meta on previews; robots.txt is not access control.
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    ...(config.indexable ? { sitemap: seoUrl("/sitemap.xml", config) } : {}),
  };
}
