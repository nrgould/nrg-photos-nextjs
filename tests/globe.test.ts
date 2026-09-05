import { test } from "node:test";
import assert from "node:assert/strict";
import { globeFrame, shortestTurn } from "../src/lib/globe";
import { travelPlaces } from "../src/lib/places";
test("a selected geographic location projects to the globe center and hides the far side", () => {
  for (const place of travelPlaces) {
    const [lng, lat] = place.coordinates;
    const frame = globeFrame(place.coordinates, [
      place.coordinates,
      [lng + 180, -lat],
    ]);
    assert.ok(frame.land.length > 100);
    assert.ok(!frame.land.includes("NaN"));
    assert.deepEqual(frame.points[0].position, [280, 280]);
    assert.equal(frame.points[0].visible, true);
    assert.equal(frame.points[1].visible, false);
  }
});
test("globe turns across the short side of the date line", () => {
  assert.equal(shortestTurn(175, -175), 10);
  assert.equal(shortestTurn(-175, 175), -10);
});
test("every location has a distinct set of original photographs", () => {
  for (const place of travelPlaces) {
    assert.ok(place.photos.length >= 2);
    assert.equal(
      new Set(place.photos.map((p) => p.src)).size,
      place.photos.length,
    );
    for (const photo of place.photos)
      assert.ok(photo.src.startsWith("/photos/"));
  }
});
