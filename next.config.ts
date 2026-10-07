import type { NextConfig } from "next";
import { getSeoConfig } from "./src/lib/seo-config";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: {
    // AVIF encodes several times slower than WebP; a cold lightbox open waited on it.
    formats: ["image/webp"],
    qualities: [75, 85],
    // Each width is a separate cache entry that fetches the whole original from Supabase,
    // so cache them long and stop at the stored 1600px. Replaced photo: docs/photo-pipeline.md.
    minimumCacheTTL: 2678400,
    deviceSizes: [640, 750, 828, 1080, 1200, 1600],
    remotePatterns: [
      new URL(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/**`,
      ),
      new URL(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/preset-examples/**`,
      ),
    ],
  },
  // The map is the whole site; retired pages land on it.
  async redirects() {
    return [
      "/explore",
      "/work/:path*",
      "/about",
      "/contact",
      "/presets/:path*",
      "/photographs/:path*",
      "/locations/:path*",
    ].map((source) => ({ source, destination: "/", permanent: false }));
  },
  async headers() {
    return getSeoConfig().indexable
      ? []
      : [
          {
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          },
        ];
  },
};
export default config;
