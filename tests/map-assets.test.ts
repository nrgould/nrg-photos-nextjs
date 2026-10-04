import { before, test } from "node:test";
import assert from "node:assert/strict";
import { geoContains } from "d3-geo";
import land from "../src/data/land.json";
let prepareLandForMercator: typeof import("../scripts/prepare-map.mjs").prepareLandForMercator;
let prepared: typeof land;
before(async () => {
  ({ prepareLandForMercator } = await import("../scripts/prepare-map.mjs"));
  prepared = prepareLandForMercator(land);
});

function ringContains(ring: number[][], [x, y]: number[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function flatLandContains([longitude, latitude]: number[]) {
  return prepared.features.some((feature) =>
    feature.geometry.coordinates.some((polygon: number[][][]) =>
      [-360, 0, 360].some((offset) => {
        const point = [longitude + offset, latitude];
        return (
          ringContains(polygon[0], point) &&
          !polygon.slice(1).some((hole) => ringContains(hole, point))
        );
      }),
    ),
  );
}

test("generated Mercator land has closed rings without cross-world segments", () => {
  for (const feature of prepared.features) {
    for (const polygon of feature.geometry.coordinates) {
      for (const ring of polygon) {
        assert.deepEqual(ring.at(-1), ring[0]);
        for (let i = 1; i < ring.length; i++) {
          assert.ok(Math.abs(ring[i][0] - ring[i - 1][0]) <= 180);
          assert.ok(ring[i].every(Number.isFinite));
        }
      }
    }
  }
});

test("flat geometry preserves land and ocean across Norway, the dateline, and the south pole", () => {
  for (const point of [
    [15, 67], // Norway
    [0, 67], // Norwegian Sea: no false horizontal land band
    [0, 80], // Arctic Ocean
    [170, 65],
    [-175, 66], // Chukotka on either side of the date line
    [179.5, 71.2], // Wrangel Island
    [179.3, -16.6],
    [-179.9, -16.35], // Fiji on either side of the date line
    [0, -89],
    [100, -89],
    [-170, -89], // Antarctica closes through the pole at every longitude
    [0, -60], // Southern Ocean stays outside Antarctica
    [135, 35], // Japan
    [30, 40], // Anatolia
  ]) {
    assert.equal(
      flatLandContains(point),
      geoContains(
        land as Parameters<typeof geoContains>[0],
        point as [number, number],
      ),
      `Spherical and flat land disagree at ${point}`,
    );
  }
});

test("preprocessing preserves the original globe source and is repeatable", () => {
  const original = structuredClone(land);
  assert.deepEqual(prepareLandForMercator(land), prepared);
  assert.deepEqual(land, original);
  assert.deepEqual(prepareLandForMercator(prepared), prepared);
  assert.equal(
    prepared.features[0].geometry.coordinates.length,
    land.features[0].geometry.coordinates.length,
  );
});
