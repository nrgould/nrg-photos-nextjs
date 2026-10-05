import { test } from "node:test";
import assert from "node:assert/strict";
import presets from "../src/data/presets.json";
import {
  createPresetCatalogState,
  filterPresetCatalog,
  getCatalogPreset,
  getPresetPurchaseStatus,
  presetCatalog,
  presetCategories,
} from "../src/lib/preset-commerce";
import { nodeForPhoto, placeNode } from "../src/lib/favorites";
import { getPresetPlaces } from "../src/lib/map-hierarchy";
import { photoPresets, travelPlaces } from "../src/lib/places";

test("commerce catalog exposes the kept lineup through a public field allowlist", () => {
  assert.equal(presetCatalog.length, presets.length);
  assert.equal(
    new Set(presetCatalog.map((preset) => preset.id)).size,
    presets.length,
  );
  assert.deepEqual(
    presetCatalog.map((preset) => preset.number),
    presetCatalog.map((_, index) => index + 1),
  );
  const fields = [
    "bestFor",
    "category",
    "example",
    "id",
    "name",
    "number",
    "showcase",
    "watchOut",
    "whatItDoes",
  ];
  for (const preset of presetCatalog) {
    for (const key of Object.keys(preset)) assert.ok(fields.includes(key), key);
    assert.ok(Object.isFrozen(preset));
  }
  assert.ok(Object.isFrozen(presetCatalog));
});

test("categories are the moods in catalog order", () => {
  assert.deepEqual(presetCategories, [
    "All",
    ...new Set(presetCatalog.map((preset) => preset.category)),
  ]);
  assert.equal(presetCategories.length, new Set(presetCategories).size);
});

test("search combines case-insensitive words with category filtering", () => {
  assert.deepEqual(
    filterPresetCatalog({ query: "  RAINIER blue  ", category: "All" }).map(
      (preset) => preset.id,
    ),
    ["mount-rainier-2"],
  );
  assert.deepEqual(
    filterPresetCatalog({ query: "", category: "Mint" }).map(
      (preset) => preset.id,
    ),
    ["boston-2", "cary-4"],
  );
  assert.deepEqual(
    filterPresetCatalog({ query: "Rainier", category: "Mint" }),
    [],
  );
  assert.equal(
    filterPresetCatalog({ query: "   ", category: "All" }).length,
    presetCatalog.length,
  );
});

test("catalog state restores known selection and filters without accepting unknown IDs", () => {
  const state = {
    query: "lake",
    category: "Natural",
    selectedPresetId: "eibsee-1",
  };
  assert.deepEqual(createPresetCatalogState(state), state);
  assert.deepEqual(
    createPresetCatalogState({
      category: "Landscape & travel",
      selectedPresetId: "signature-01",
    }),
    { query: "", category: "All", selectedPresetId: null },
  );
});

test("purchase availability rejects unknown identities and never invents a price", () => {
  for (const preset of presetCatalog)
    assert.deepEqual(getPresetPurchaseStatus(preset.id), {
      status: "not-configured",
      presetId: preset.id,
    });
  for (const id of [null, undefined, 1, {}, "", "__proto__", "signature-01"])
    assert.deepEqual(getPresetPurchaseStatus(id), { status: "unknown-preset" });
  assert.equal(getCatalogPreset("Eibsee I"), undefined);
});

test("showcase photos are map photos", () => {
  for (const preset of presetCatalog)
    for (const src of preset.showcase) assert.ok(nodeForPhoto(src), src);
});

test("preset places hold exactly the photos edited with that preset", () => {
  for (const preset of presetCatalog) {
    const places = getPresetPlaces(travelPlaces, preset.id);
    const srcs = places.flatMap((place) => place.photos.map((p) => p.src));
    assert.deepEqual(
      srcs.toSorted(),
      [...photoPresets]
        .filter(([, id]) => id === preset.id)
        .map(([src]) => src)
        .filter((src) => nodeForPhoto(src))
        .toSorted(),
    );
    for (const place of places) {
      assert.ok(placeNode(place.id), place.id);
      assert.equal(place.photoCount, place.photos.length);
    }
  }
  assert.deepEqual(getPresetPlaces(travelPlaces, "signature-01"), []);
});
