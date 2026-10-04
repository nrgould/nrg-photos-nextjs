import assert from "node:assert/strict";
const base = process.env.PREVIEW_URL || "http://localhost:3107";
const cases = [
  ["/", "<em>Photography</em></h1>", 0],
  ["/explore", "Places &amp; presets", 0],
  ["/about", "<h1>About</h1>", 0],
  ["/contact", "<h1>Contact</h1>", 0],
  ["/work", "<h1>Work</h1>", 39],
  ["/work?collection=a-study-in-green", "<h1>Work</h1>", 7],
  ["/work/a-study-in-green", "A study in green", 7],
  ["/work/far-from-here", "Far from here", 12],
  ["/work/everyday-stories", "Everyday stories", 8],
  ["/work/people-and-places", "People &amp;", 12],
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
  assert.equal(
    (html.match(/class="photo-button"/g) || []).length,
    count,
    `${path}: server-rendered photograph count`,
  );
  assert.ok(!html.includes("images.unsplash.com"), `${path}: no stock images`);
  assert.ok(!html.includes('href="/prints"'), `${path}: no print navigation`);
  if (path === "/") {
    assert.ok(html.includes('id="places"'), "globe section in server HTML");
    assert.ok(html.includes("data-land"), "globe geography in server HTML");
    assert.ok(
      html.includes("Show photographs from Italy"),
      "clickable globe locations in server HTML",
    );
    assert.ok(html.includes("polaroid"), "photo stack in server HTML");
    assert.ok(!html.includes("A few stops along the way"));
    assert.ok(!html.includes("Near home. Far from familiar"));
    assert.ok(
      html.includes("North Carolina"),
      "globe locations in server HTML",
    );
  }
  console.log(
    `PASS ${path}: HTTP 200, server HTML, metadata${count ? `, ${count} photographs` : ""}`,
  );
}
const missing = await fetch(base + "/work/not-a-real-collection");
const missingHtml = await missing.text();
assert.ok(missingHtml.includes("Page not found"));
assert.ok(missingHtml.includes("noindex"));
console.log(
  `PASS unknown collection: not-found page and noindex (HTTP ${missing.status})`,
);
for (const path of ["/robots.txt", "/sitemap.xml"]) {
  const response = await fetch(base + path);
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes("/prints"));
  console.log(`PASS ${path}`);
}
assert.equal((await fetch(base + "/prints")).status, 404);
console.log("PASS removed prints route: HTTP 404");
