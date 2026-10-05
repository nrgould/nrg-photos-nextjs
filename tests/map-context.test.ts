import { before, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { feature, mesh } from "topojson-client";
import { geoContains } from "d3-geo";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { GeoPermissibleObjects } from "d3-geo";
import {
  prepareCountryContext,
  simplifyCountryTopology,
  splitDatelineLines,
} from "../scripts/lib/map-context.mjs";
import countries from "../src/data/country-labels.json";
import cities from "../src/data/city-labels.json";

const topology = JSON.parse(
  readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"),
);
const simplified = simplifyCountryTopology(topology) as Topology<{
  countries: GeometryCollection;
  land: GeometryCollection;
}>;
const context = prepareCountryContext(topology);
let prepareLandForMercator: typeof import("../scripts/prepare-map.mjs").prepareLandForMercator;
before(async () => {
  ({ prepareLandForMercator } = await import("../scripts/prepare-map.mjs"));
});

function distance(point: number[], a: number[], b: number[]) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1];
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(
        0,
        Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / length),
      )
    : 0;
  return Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
}

test("Austria–Italy shared border retains source fidelity and Alpine country membership", () => {
  const alpine = (a: { id?: string | number }, b: { id?: string | number }) =>
    a.id !== b.id &&
    [a.id, b.id].includes("040") &&
    [a.id, b.id].includes("380");
  const original = mesh(topology, topology.objects.countries, alpine);
  const border = mesh(simplified, simplified.objects.countries, alpine);
  assert.ok(border.coordinates.flat().length > 2);
  const segments = border.coordinates.flatMap((line) =>
    line.slice(1).map((point, i) => [line[i], point]),
  );
  for (const point of original.coordinates.flat())
    assert.ok(
      Math.min(...segments.map(([a, b]) => distance(point, a, b))) <= 0.0401,
    );
  for (const [id, inside, outside] of [
    [
      "380",
      [
        [11.35, 46.5],
        [12.09, 46.69],
      ],
      [[11.4, 47.26]],
    ],
    [
      "040",
      [
        [11.4, 47.26],
        [13.65, 47.56],
      ],
      [
        [11.35, 46.5],
        [12.09, 46.69],
      ],
    ],
  ] as const) {
    const geometry = simplified.objects.countries.geometries.find(
      (country) => country.id === id,
    );
    assert.ok(geometry);
    const country = feature(simplified, geometry) as GeoPermissibleObjects;
    for (const point of inside)
      assert.equal(geoContains(country, [...point]), true);
    for (const point of outside)
      assert.equal(geoContains(country, [...point]), false);
  }
});

test("country lines split both dateline directions without world-spanning segments", () => {
  const split = splitDatelineLines([
    [
      [179, 20],
      [-179, 22],
    ],
    [
      [-179, -20],
      [179, -22],
    ],
  ]);
  assert.deepEqual(split, [
    [
      [179, 20],
      [180, 21],
    ],
    [
      [-180, 21],
      [-179, 22],
    ],
    [
      [-179, -20],
      [-180, -21],
    ],
    [
      [180, -21],
      [179, -22],
    ],
  ]);
  for (const line of context.boundaries.geometry.coordinates)
    for (let i = 1; i < line.length; i++)
      assert.ok(Math.abs(line[i][0] - line[i - 1][0]) <= 180);
  const land = prepareLandForMercator(context.land);
  for (const polygon of land.features[0].geometry.coordinates)
    for (const ring of polygon) {
      assert.deepEqual(ring[0], ring.at(-1));
      for (let i = 1; i < ring.length; i++)
        assert.ok(Math.abs(ring[i][0] - ring[i - 1][0]) <= 180);
    }
});

test("country and sparse city labels are unique, geographically valid and reachable at supported zoom", () => {
  assert.equal(countries.features.length, 242);
  assert.equal(cities.features.length, 170);
  for (const collection of [countries, cities]) {
    assert.equal(
      new Set(collection.features.map((entry) => entry.properties.id)).size,
      collection.features.length,
    );
    for (const entry of collection.features) {
      const [longitude, latitude] = entry.geometry.coordinates;
      assert.ok(Number.isFinite(longitude) && Math.abs(longitude) <= 180);
      assert.ok(Number.isFinite(latitude) && Math.abs(latitude) <= 90);
      assert.ok(entry.properties.name.length > 0);
      assert.ok(
        entry.properties.minZoom >= 1.4 && entry.properties.minZoom <= 3.7,
      );
    }
  }
  for (const name of ["Austria", "Italy", "Japan"])
    assert.ok(
      countries.features.some((entry) => entry.properties.name === name),
    );
  for (const name of ["Vienna", "Rome", "Oslo", "Tokyo"])
    assert.ok(cities.features.some((entry) => entry.properties.name === name));
});

test("context generation is deterministic, does not mutate source, and stays within compressed budget", () => {
  const original = structuredClone(topology);
  assert.deepEqual(prepareCountryContext(topology), context);
  assert.deepEqual(topology, original);
  const total = [
    prepareLandForMercator(context.land),
    context.boundaries,
    countries,
    cities,
  ].reduce((bytes, data) => bytes + gzipSync(JSON.stringify(data)).length, 0);
  assert.ok(
    total < 250000,
    `Map context gzip size ${total} exceeds 250KB budget`,
  );
});
