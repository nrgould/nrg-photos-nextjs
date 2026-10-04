import { test } from "node:test";
import assert from "node:assert/strict";
import signatureCollection from "../src/lib/signature-collection.json";
import {
  createPresetCatalogState,
  filterPresetCatalog,
  getCatalogPreset,
  getPresetPurchaseStatus,
  getVerifiedPresetLocations,
  presetCatalog,
} from "../src/lib/preset-commerce";

test("commerce catalog exposes every real preset through a public field allowlist", () => {
  assert.equal(presetCatalog.length, 21);
  assert.equal(new Set(presetCatalog.map((preset) => preset.id)).size, 21);
  assert.deepEqual(presetCatalog, signatureCollection);
  for (const preset of presetCatalog) {
    assert.deepEqual(Object.keys(preset).sort(), [
      "category",
      "id",
      "name",
      "number",
    ]);
    assert.ok(Object.isFrozen(preset));
  }
  assert.ok(Object.isFrozen(presetCatalog));
});

test("search combines case-insensitive words with category filtering", () => {
  assert.deepEqual(
    filterPresetCatalog({ query: "  ALPINE travel  ", category: "All" }).map(
      (preset) => preset.id,
    ),
    ["signature-01", "signature-12"],
  );
  assert.deepEqual(
    filterPresetCatalog({ query: "", category: "Film" }).map(
      (preset) => preset.name,
    ),
    ["Classic Film", "Muted Film"],
  );
  assert.deepEqual(
    filterPresetCatalog({ query: "Alpine", category: "Film" }),
    [],
  );
  assert.equal(
    filterPresetCatalog({ query: "   ", category: "All" }).length,
    21,
  );
});

test("catalog state restores known selection and filters without accepting sample IDs", () => {
  const state = {
    query: "forest",
    category: "Nature" as const,
    selectedPresetId: "signature-04",
  };
  assert.deepEqual(createPresetCatalogState(state), state);
  assert.deepEqual(
    createPresetCatalogState({ selectedPresetId: "alpine-soft" }),
    {
      query: "",
      category: "All",
      selectedPresetId: null,
    },
  );
  assert.deepEqual(createPresetCatalogState(), {
    query: "",
    category: "All",
    selectedPresetId: null,
  });
});

test("purchase availability rejects unknown and sample identities and never invents a price", () => {
  for (const preset of presetCatalog)
    assert.deepEqual(getPresetPurchaseStatus(preset.id), {
      status: "not-configured",
      presetId: preset.id,
    });
  for (const id of [
    null,
    undefined,
    1,
    {},
    "",
    "alpine-soft",
    "__proto__",
    "signature-99",
  ])
    assert.deepEqual(getPresetPurchaseStatus(id), { status: "unknown-preset" });
});

test("location links remain unavailable until actual preset edit usage is verified", () => {
  for (const preset of presetCatalog)
    assert.deepEqual(getVerifiedPresetLocations(preset.id), []);
  assert.deepEqual(getVerifiedPresetLocations("alpine-soft"), []);
  assert.equal(getCatalogPreset("Alpine Light"), undefined);
  assert.equal(getCatalogPreset("signature-01")?.name, "Alpine Light");
});
