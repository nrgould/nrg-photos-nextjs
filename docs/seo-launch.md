# SEO launch gate

The integrated site adds 9 source-verified location pages, 39 public photograph pages and 21 preset detail pages, plus two indexes. Existing catalog cards and the footer provide visible server-rendered links. Invalid IDs return 404. Public image identity/dimensions and regional membership come from existing source data; no camera GPS, private paths, fictitious reviews, license or purchase availability is added.

Preview defaults: global noindex metadata and X-Robots-Tag on pages/images, empty sitemap and no advertised sitemap in robots.txt. Crawling is permitted so crawlers can read noindex. This is not access control. New routes omit inherited legacy canonicals. Without a configured public origin, absolute share images and JSON-LD are omitted rather than inventing a host.

Indexing requires all three values: `SEO_LAUNCH_INDEXING=true`, `VERCEL_ENV=production`, and a valid HTTPS `SEO_CANONICAL_ORIGIN`. The intended future origin is `https://nrgstudios.co`; ownership does not mean this app serves there. Optional `SEO_PUBLIC_ORIGIN` supplies absolute preview share/schema URLs without enabling indexing. These are build/runtime configuration and require a rebuild/restart. No values were persisted, and no DNS/domain/production settings were changed.

At launch, the sitemap has 81 unique URLs and 39 public image entries, all on the configured canonical origin. JSON-LD includes visible breadcrumbs and truthful ImageObject, CollectionPage or Product identity. Unavailable presets use a price property, not an Offer, inventory status, fabricated rating or claim of Google rich-result eligibility. Review unavailable copy and product schema when real commerce is activated.

Controlled local verification uses `EXPECT_INDEXABLE=1` with `scripts/verify-ssr.mjs` against a locally built server; the final default build must return to preview noindex. Do not enable production indexing until the domain serves this app and launch is explicitly approved.

References: [Next JSON-LD](https://nextjs.org/docs/app/guides/json-ld), [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), [Google Product snippets](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).
