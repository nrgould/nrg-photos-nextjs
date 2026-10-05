import assert from "node:assert/strict";
import test from "node:test";
import { allPhotos } from "@/lib/photography";
import { UNIT_PRICE_CENTS } from "@/lib/preset-cart";
import {
  getSeoConfig,
  seoLaunchMetadata,
  seoRobotsFile,
  seoUrl,
} from "../src/lib/seo-config";
import {
  breadcrumbData,
  contentMetadata,
  getPhotoLocation,
  getSeoLocation,
  getSeoPhoto,
  imageData,
  locationData,
  locationDescription,
  locationPath,
  locationSlug,
  photoDescription,
  photoPath,
  photoSlug,
  presetDescription,
  presetPath,
  productData,
  seoLocations,
  seoPhotos,
  seoPresets,
  seoSitemapEntries,
  serializeJsonLd,
} from "../src/lib/seo-content";

const launched = getSeoConfig({
  SEO_LAUNCH_INDEXING: "true",
  VERCEL_ENV: "production",
  SEO_CANONICAL_ORIGIN: "https://nrgstudios.co",
});
const preview = getSeoConfig({
  SEO_LAUNCH_INDEXING: "true",
  VERCEL_ENV: "preview",
  SEO_CANONICAL_ORIGIN: "https://nrgstudios.co",
  SEO_PUBLIC_ORIGIN: "https://example-preview.vercel.app",
});

test("indexing fails closed unless all launch gates are explicit", () => {
  assert.deepEqual(getSeoConfig({}), { indexable: false, origin: null });
  for (const env of [
    { VERCEL_ENV: "production", SEO_CANONICAL_ORIGIN: "https://nrgstudios.co" },
    {
      SEO_LAUNCH_INDEXING: "true",
      SEO_CANONICAL_ORIGIN: "https://nrgstudios.co",
    },
    { SEO_LAUNCH_INDEXING: "true", VERCEL_ENV: "production" },
    {
      SEO_LAUNCH_INDEXING: "TRUE",
      VERCEL_ENV: "production",
      SEO_CANONICAL_ORIGIN: "https://nrgstudios.co",
    },
  ])
    assert.equal(getSeoConfig(env).indexable, false);
  assert.equal(preview.indexable, false);
  assert.equal(preview.origin, "https://example-preview.vercel.app");
  assert.deepEqual(launched, {
    indexable: true,
    origin: "https://nrgstudios.co",
  });
});

test("malformed origins cannot enable launch or create unintended canonical URLs", () => {
  for (const origin of [
    "http://nrgstudios.co",
    "https://u:p@nrgstudios.co",
    "https://nrgstudios.co/path",
    "https://nrgstudios.co?x=y",
    "https://nrgstudios.co#x",
    "https://localhost",
    "garbage",
  ]) {
    assert.equal(
      getSeoConfig({
        SEO_LAUNCH_INDEXING: "true",
        VERCEL_ENV: "production",
        SEO_CANONICAL_ORIGIN: origin,
      }).indexable,
      false,
    );
  }
  assert.equal(seoUrl("//foreign.example/", launched), undefined);
  assert.equal(
    seoUrl("/locations", launched),
    "https://nrgstudios.co/locations",
  );
});

test("preview metadata clears inherited canonical and cannot advertise future domain", () => {
  const photo = seoPhotos[0];
  const metadata = contentMetadata(
    photo.title,
    photoDescription(photo),
    photoPath(photo),
    photo,
    preview,
  );
  assert.equal(metadata.alternates?.canonical, null);
  assert.deepEqual(metadata.robots, {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false, "max-image-preview": "large" },
  });
  assert.ok(!JSON.stringify(metadata).includes("nrgstudios.co"));
  assert.equal(seoLaunchMetadata(preview).metadataBase, undefined);
  assert.equal(
    String(seoLaunchMetadata(launched).metadataBase),
    "https://nrgstudios.co/",
  );
  assert.equal(seoRobotsFile(preview).sitemap, undefined);
  assert.equal(
    seoRobotsFile(launched).sitemap,
    "https://nrgstudios.co/sitemap.xml",
  );
  assert.deepEqual(seoSitemapEntries(preview), []);
});

test("every published source has one stable direct route and unique metadata", () => {
  assert.equal(seoPhotos.length, 37);
  assert.ok(seoLocations.some((node) => node.id === "location:lake-james"));
  assert.equal(seoPresets.length, 28);
  assert.equal(new Set(seoPhotos.map(photoPath)).size, 37);
  assert.equal(
    new Set(seoLocations.map(locationPath)).size,
    seoLocations.length,
  );
  assert.equal(new Set(seoPresets.map(presetPath)).size, 28);
  assert.equal(new Set(seoPhotos.map(photoDescription)).size, 37);
  assert.equal(
    new Set(seoLocations.map(locationDescription)).size,
    seoLocations.length,
  );
  assert.equal(new Set(seoPresets.map(presetDescription)).size, 28);
  for (const photo of allPhotos)
    assert.equal(getSeoPhoto(photoSlug(photo)), photo);
  for (const node of seoLocations)
    assert.equal(getSeoLocation(locationSlug(node)), node);
  assert.equal(getSeoLocation("italy"), undefined);
  assert.equal(getSeoPhoto("not-a-photo"), undefined);
  const sitemap = seoSitemapEntries(launched);
  // Two indexes + every location + 37 photos + 28 presets.
  assert.equal(sitemap.length, 2 + seoLocations.length + 37 + 28);
  assert.equal(new Set(sitemap.map((item) => item.url)).size, sitemap.length);
  assert.deepEqual(
    sitemap.flatMap((item) => item.images ?? []).sort(),
    seoPhotos.map((photo) => `https://nrgstudios.co${photo.src}`).sort(),
  );
  assert.ok(
    sitemap.every(
      (item) =>
        item.url.startsWith("https://nrgstudios.co/") && !item.lastModified,
    ),
  );
});

test("image schema exposes only public preview identity and honest location membership", () => {
  for (const photo of seoPhotos) {
    const data = imageData(photo, launched)!;
    assert.equal(data.contentUrl, `https://nrgstudios.co${photo.src}`);
    assert.equal(data.width, photo.width);
    assert.equal(data.height, photo.height);
    assert.equal(data.creator.name, "Nicholas Gould");
    assert.equal(data.contentLocation?.name, getPhotoLocation(photo)?.label);
    assert.ok(!("geo" in (data.contentLocation ?? {})));
    assert.ok(!("license" in data));
    assert.ok(!JSON.stringify(data).includes("original"));
  }
  assert.equal(seoPhotos.filter((photo) => getPhotoLocation(photo)).length, 4);
  assert.equal(getPhotoLocation(seoPhotos[0]), undefined);
  assert.equal(imageData(seoPhotos[0], getSeoConfig({})), null);
  for (const location of seoLocations) {
    const data = locationData(location, launched)!;
    assert.equal(data.hasPart.length, location.photos.length);
    assert.equal(data.about.description, location.referenceLabel);
    assert.ok(!("geo" in data.about));
  }
});

test("preset schema preserves price facts without fake purchasing or preview claims", () => {
  for (const preset of seoPresets) {
    const data = productData(preset, launched)!;
    assert.equal(data.sku, preset.id);
    assert.equal(
      data.additionalProperty[0].value,
      (UNIT_PRICE_CENTS / 100).toFixed(2),
    );
    assert.match(data.description, /\$1\.99 USD; checkout is not available/);
    for (const unsupported of [
      "offers",
      "availability",
      "aggregateRating",
      "review",
      "image",
    ])
      assert.ok(!(unsupported in data));
  }
});

test("breadcrumbs match visible route order and JSON-LD cannot close its script element", () => {
  const items = [
    { name: "Home", path: "/" },
    { name: "Locations", path: "/locations" },
    { name: "Hallstatt", path: "/locations/hallstatt" },
  ];
  const data = breadcrumbData(items, launched)!;
  assert.deepEqual(
    data.itemListElement.map((item) => [item.position, item.name, item.item]),
    items.map((item, i) => [
      i + 1,
      item.name,
      `https://nrgstudios.co${item.path}`,
    ]),
  );
  const value = { name: '</script><script>alert("x")</script>' };
  const serialized = serializeJsonLd(value);
  assert.ok(!serialized.includes("<"));
  assert.deepEqual(JSON.parse(serialized), value);
});
