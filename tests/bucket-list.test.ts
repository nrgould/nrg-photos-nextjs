import { test } from "node:test";
import assert from "node:assert/strict";
import { bucketList } from "../src/lib/bucket-list";
import locations from "../src/data/locations.json";

test("bucket-list places stay unphotographed", () => {
  assert.equal(
    new Set(bucketList.map((place) => place.id)).size,
    bucketList.length,
  );
  const names = new Set(locations.map((node) => node.name));
  const pins = locations.flatMap((node) =>
    "coordinates" in node ? [node.coordinates as number[]] : [],
  );
  for (const place of bucketList) {
    // Once photographed, its Lightroom import adds a node here; drop it from the list.
    assert.ok(!names.has(place.name), `${place.name} has photos`);
    const [lon, lat] = place.coordinates;
    const near = pins.find(([x, y]) => Math.hypot(x - lon, y - lat) < 1);
    assert.equal(near, undefined, `${place.name} sits on a photographed place`);
  }
});
