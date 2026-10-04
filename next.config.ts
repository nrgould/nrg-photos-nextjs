import type { NextConfig } from "next";
import { getSeoConfig } from "./src/lib/seo-config";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"], qualities: [75, 85] },
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
