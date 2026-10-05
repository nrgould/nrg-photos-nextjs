import { test } from "node:test";
import assert from "node:assert/strict";
import countryLabels from "../src/data/country-labels.json";
import {
  centroid,
  locationFields,
  resolveLocation,
  slug,
} from "../scripts/lib/photo-import.mjs";

test("Lightroom locations reuse tree nodes by name, add new ones once, and keep ids unique", () => {
  const tree: { id: string; name: string; parent?: string }[] = [
    { id: "norway", name: "Norway" },
    { id: "nordland", parent: "norway", name: "Nordland" },
  ];
  const created: unknown[] = [];
  assert.equal(
    resolveLocation(
      tree,
      ["norway", "Nordland", "Henningsvær"],
      countryLabels,
      created,
    ),
    "henningsvaer",
  );
  assert.equal(created.length, 1);
  assert.equal(
    resolveLocation(
      tree,
      ["Sweden", "Stockholm", "Stockholm"],
      countryLabels,
      created,
    ),
    "stockholm-stockholm",
  );
  assert.deepEqual(
    tree.find((node) => node.id === "sweden"),
    {
      id: "sweden",
      name: "Sweden",
      naturalEarthId: "SWE",
    },
  );
  assert.throws(() => resolveLocation(tree, ["Füssen"], countryLabels, []));
  assert.equal(slug("Baden-Württemberg"), "baden-wurttemberg");
});

test("a location with a gap above a filled field is rejected, not guessed", () => {
  assert.deepEqual(locationFields({ country: "Austria", city: "Hallstatt" }), {
    error: "missing State",
  });
  assert.deepEqual(
    locationFields({
      country: " Austria ",
      state: "Upper Austria",
      city: "Hallstatt",
    }),
    { names: ["Austria", "Upper Austria", "Hallstatt"] },
  );
  assert.deepEqual(locationFields({}), { names: [] });
  assert.deepEqual(
    centroid([
      [13.651, 47.561],
      [13.659, 47.569],
    ]),
    [13.66, 47.57],
  );
});
