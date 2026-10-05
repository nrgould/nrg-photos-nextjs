import test from "node:test";
import assert from "node:assert/strict";
import { zoomLevels, zoomPosition, zoomStop } from "../src/lib/map-zoom-stops";

test("every explicit zoom level round-trips to its discrete stop", () => {
  zoomLevels.forEach((zoom, stop) =>
    assert.equal(zoomStop(stop === 0 ? "globe" : "map", zoom), stop),
  );
});

test("continuous native zoom reports a nearest stop without changing the camera value", () => {
  for (const zoom of [0.2, 1.23, 2.61, 3.22, 4.6, 7.2, 9.9]) {
    const stop = zoomStop("map", zoom);
    assert.ok(Number.isInteger(stop) && stop >= 1 && stop <= 5);
  }
  assert.equal(zoomStop("map", 3.22), 3);
  assert.equal(zoomStop("map", Math.sqrt(3 * 5) - 0.001), 3);
  assert.equal(zoomStop("map", Math.sqrt(3 * 5) + 0.001), 4);
  assert.equal(zoomStop("globe", 2.4), 0);
});

test("out-of-range and invalid zoom cannot wrap the slider back from Local to World", () => {
  assert.equal(zoomStop("map", 100), 5);
  assert.equal(zoomStop("map", -1), 1);
  assert.equal(zoomStop("map", NaN), 1);
});

test("rail position is continuous between stops", () => {
  assert.equal(zoomPosition("map", 5), 4);
  assert.ok(zoomPosition("map", 4) > 3 && zoomPosition("map", 4) < 4);
  assert.equal(zoomPosition("globe", 4), 0);
});
