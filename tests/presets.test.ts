import { test } from "node:test";
import assert from "node:assert/strict";
import {
  presets,
  curatedPacks,
  restoreCollection,
  addPack,
  shuffleIndex,
  packManifest,
} from "../src/lib/presets";
import { travelPlaces } from "../src/lib/places";
import { flatFrame, zoomStops } from "../src/lib/globe";

test("every sample recipe links to a real original and real locations", () => {
  for (const recipe of presets) {
    assert.equal(recipe.provenance, "sample");
    assert.ok(
      travelPlaces.some((p) =>
        p.photos.some((photo) => photo.src === recipe.photoSrc),
      ),
    );
    for (const id of recipe.placeIds)
      assert.ok(travelPlaces.some((p) => p.id === id));
  }
});
test("custom and curated selections deduplicate, preserve choice and remain explicitly samples", () => {
  const selected = addPack([presets[0].id], curatedPacks[0].presetIds);
  assert.equal(selected.length, 2);
  assert.deepEqual(addPack(selected, curatedPacks[0].presetIds), selected);
  assert.equal(packManifest(selected).purchasable, false);
  assert.equal(packManifest(selected).presets.length, 2);
});
test("restored favorites discard unknown IDs, malformed values and duplicates", () => {
  const place = travelPlaces[0];
  assert.deepEqual(restoreCollection("{"), {
    places: [],
    photos: [],
    presets: [],
  });
  assert.deepEqual(
    restoreCollection(
      JSON.stringify({
        places: [place.id, place.id, "unknown", null],
        photos: [place.photos[0].src, "/private"],
        presets: [presets[0].id, 2],
      }),
    ),
    {
      places: [place.id],
      photos: [place.photos[0].src],
      presets: [presets[0].id],
    },
  );
});
test("shuffle excludes current location across random boundaries", () => {
  for (let i = 0; i < 4; i++)
    for (const random of [0, 0.25, 0.5, 0.99, 1]) {
      const next = shuffleIndex(i, 4, random);
      assert.notEqual(next, i);
      assert.ok(next >= 0 && next < 4);
    }
  assert.equal(shuffleIndex(0, 1), 0);
});
test("all map zoom stops center the selected place and produce valid local geography", () => {
  for (const place of travelPlaces)
    for (const zoom of zoomStops) {
      const map = flatFrame(place.coordinates, zoom, [place.coordinates]);
      assert.ok(map.land.length > 0);
      assert.ok(!map.land.includes("NaN"));
      assert.ok(Math.abs(map.points[0].position[0] - 420) < 0.001);
      assert.ok(Math.abs(map.points[0].position[1] - 280) < 0.001);
    }
});

test("map focus remains in the visible area beside a photo canvas", () => {
  const center: [number, number] = [13.65, 47.56];
  const desktop = flatFrame(center, 3, [center], [1327, 1030], [-150, 0]);
  assert.deepEqual(desktop.points[0].position, [513.5, 515]);
  const mobile = flatFrame(center, 3, [center], [390, 844], [0, -177.24]);
  assert.equal(mobile.points[0].position[0], 195);
  assert.ok(Math.abs(mobile.points[0].position[1] - 244.76) < 1e-8);
});

test("fractional camera zoom keeps map geometry and marker projection aligned", () => {
  const center: [number, number] = [12.09, 46.69];
  const first = flatFrame(center, 1, [center], [390, 844]);
  for (const zoom of [1.25, 3.3874, 7.9]) {
    const frame = flatFrame(center, zoom, [center], [390, 844], [0, -105.5]);
    assert.equal(frame.land, first.land);
    assert.equal(frame.grid, first.grid);
    assert.ok(frame.transform.endsWith(`scale(${zoom})`));
    assert.ok(Math.abs(frame.points[0].position[0] - 195) < 1e-8);
    assert.ok(Math.abs(frame.points[0].position[1] - 316.5) < 1e-8);
  }
});
