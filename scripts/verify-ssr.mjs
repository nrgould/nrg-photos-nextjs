import assert from "node:assert/strict";
const base = process.env.PREVIEW_URL || "http://localhost:3107";
const indexable = process.env.EXPECT_INDEXABLE === "1";
const canonicalOrigin =
  process.env.SEO_CANONICAL_ORIGIN || "https://nrgstudios.co";
const cases = [
  ["/", "Photographs on the map", 0],
  ["/?view=catalog&preset=eibsee-1", "Photographs on the map", 0],
];
for (const [path, text, count] of cases) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, path);
  const html = (await response.text()).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/gi,
    "",
  );
  assert.ok(html.includes(text), `${path}: server-rendered heading`);
  assert.ok(html.includes('id="main"'), `${path}: main content`);
  assert.ok(html.includes('rel="canonical"'), `${path}: canonical metadata`);
  if (!indexable) {
    assert.match(
      response.headers.get("x-robots-tag") ?? "",
      /noindex/,
      `${path}: preview header`,
    );
    assert.match(
      html,
      /name="robots" content="[^"]*noindex/,
      `${path}: preview metadata`,
    );
  }
  assert.equal(
    (html.match(/class="photo-button"/g) || []).length,
    count,
    `${path}: server-rendered photograph count`,
  );
  assert.ok(!html.includes("images.unsplash.com"), `${path}: no stock images`);
  assert.ok(!html.includes('href="/prints"'), `${path}: no print navigation`);
  if (path === "/") {
    assert.ok(html.includes("data-location"), "map locations in server HTML");
    assert.ok(
      !html.includes("location-drawer"),
      "photo drawer initially closed",
    );
    assert.ok(!html.includes("site-header"), "no site header on the map");
  }
  console.log(
    `PASS ${path}: HTTP 200, server HTML, metadata${count ? `, ${count} photographs` : ""}`,
  );
}
for (const path of ["/explore", "/presets/eibsee-1", "/work", "/about"]) {
  const response = await fetch(base + path, { redirect: "manual" });
  assert.ok([307, 308].includes(response.status), `${path}: redirects`);
  assert.equal(new URL(response.headers.get("location"), base).pathname, "/");
}
console.log("PASS retired pages redirect to the map");
const missing = await fetch(base + "/not-a-real-page");
const missingHtml = await missing.text();
assert.ok(missingHtml.includes("Page not found"));
assert.ok(missingHtml.includes("noindex"));
console.log(
  `PASS unknown page: not-found page and noindex (HTTP ${missing.status})`,
);
for (const path of ["/robots.txt", "/sitemap.xml"]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.ok(!text.includes("/prints"));
  if (path === "/sitemap.xml") {
    const urls = [...text.matchAll(/<loc>(.*?)<\/loc>/g)].map(
      (match) => match[1],
    );
    assert.equal(urls.length, indexable ? 1 : 0, "launch-gated sitemap");
    assert.ok(
      urls.every(
        (url) =>
          url.startsWith(canonicalOrigin + "/") || url === canonicalOrigin,
      ),
    );
  } else
    assert.equal(
      text.includes("Sitemap:"),
      indexable,
      "launch-gated robots sitemap",
    );
  console.log(`PASS ${path}`);
}
assert.equal((await fetch(base + "/prints")).status, 404);
console.log("PASS removed prints route: HTTP 404");
const imageResponse = await fetch(
  base +
    "/_next/image?url=" +
    encodeURIComponent(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/hallstatt-2.webp`,
    ) +
    "&w=640&q=75",
);
assert.equal(imageResponse.status, 200);
if (!indexable)
  assert.match(
    imageResponse.headers.get("x-robots-tag") ?? "",
    /noindex/,
    "preview image header",
  );
const availability = await fetch(base + "/api/commerce/availability");
assert.equal(availability.status, 200);
assert.deepEqual(await availability.json(), { status: "unavailable" });
for (const [path, method] of [
  ["ownership", "GET"],
  ["download/eibsee-1", "GET"],
  ["checkout", "POST"],
  ["reward-claim", "POST"],
  ["webhook", "POST"],
]) {
  const response = await fetch(`${base}/api/commerce/${path}`, { method });
  assert.equal(
    response.status,
    503,
    `${path}: fail closed without configured durable commerce`,
  );
  assert.match(response.headers.get("cache-control") ?? "", /no-store/, path);
}
console.log(
  "PASS invalid SEO routes, preview image policy and all unconfigured commerce boundaries",
);
