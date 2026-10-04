import { test } from "node:test";
import assert from "node:assert/strict";
import {
  expression,
  latest,
  ProjectionDefinition,
  type StylePropertySpecification,
} from "@maplibre/maplibre-gl-style-spec";
import {
  continuousProjection,
  constrainCamera,
  engineZoom,
  markerLevel,
  markerOffsets,
  uiZoom,
} from "../src/lib/map-camera";
import { getMapNodes } from "../src/lib/map-hierarchy";
import { travelPlaces } from "../src/lib/places";

test("MapLibre evaluates globe, intermediate projection, and flat World states", () => {
  const parsed = expression.createPropertyExpression(
    continuousProjection.type,
    "projection",
    latest.projection.type as StylePropertySpecification,
  );
  assert.equal(parsed.result, "success");
  if (parsed.result !== "success") return;
  assert.equal(parsed.value.evaluate({ zoom: 0 }), "vertical-perspective");
  const intermediate = parsed.value.evaluate({ zoom: 0.5 });
  assert.ok(intermediate instanceof ProjectionDefinition);
  assert.equal(intermediate.from, "vertical-perspective");
  assert.equal(intermediate.to, "mercator");
  assert.equal(intermediate.transition, 0.5);
  assert.equal(parsed.value.evaluate({ zoom: engineZoom(1) }), "mercator");
});

test("slider stops reach geographic detail and remain invertible between stops", () => {
  assert.deepEqual([0, 1, 2, 3, 5, 10].map(engineZoom), [0, 1, 3, 5, 8, 12]);
  for (const scale of [0, 0.5, 1, 1.7, 2, 3, 3.5, 5, 7.1, 10])
    assert.ok(Math.abs(uiZoom(engineZoom(scale)) - scale) < 1e-10);
});

test("explicit camera constraints always allow the globe stop and preserve longitude wrapping", () => {
  assert.deepEqual(constrainCamera({ lng: 370, lat: 47 }, 0), {
    longitude: 370,
    latitude: 47,
    zoom: 0,
  });
  assert.deepEqual(constrainCamera({ lng: -380, lat: -89 }, 18), {
    longitude: -380,
    latitude: -85,
    zoom: 12,
  });
});

test("regional breakout has hysteresis during small pinch changes", () => {
  const threshold = engineZoom(3);
  assert.equal(markerLevel(threshold + 0.13, "country"), "location");
  assert.equal(markerLevel(threshold + 0.05, "country"), "country");
  assert.equal(markerLevel(threshold - 0.05, "location"), "location");
  assert.equal(markerLevel(threshold - 0.13, "location"), "country");
});

test("nearby Alpine markers separate their hit targets while retaining close geographic callouts", () => {
  const anchors = [
    { id: "austria", x: 180, y: 200 },
    { id: "italy", x: 177, y: 209 },
  ];
  const offsets = markerOffsets(anchors, { width: 390, height: 800 });
  const a = offsets.get("austria")!;
  const b = offsets.get("italy")!;
  assert.ok(Math.abs(anchors[0].y + a.y - anchors[1].y - b.y) >= 52);
  for (const offset of offsets.values())
    assert.ok(Math.hypot(offset.x, offset.y) < 40);
  assert.deepEqual(
    markerOffsets([...anchors].reverse(), { width: 390, height: 800 }),
    offsets,
  );
});

test("collision placement respects priority and viewport edges without mutating anchors", () => {
  const anchors = [
    { id: "a", x: 50, y: 30 },
    { id: "b", x: 55, y: 30, priority: true },
  ];
  const original = structuredClone(anchors);
  const offsets = markerOffsets(anchors, { width: 390, height: 800 });
  assert.deepEqual(offsets.get("b"), { x: 0, y: 28 });
  assert.deepEqual(anchors, original);
  assert.equal(markerOffsets([], { width: 390, height: 800 }).size, 0);
});

test("three nearby European country stacks keep 48px targets apart on a small globe", () => {
  const anchors = [
    { id: "austria", x: 400, y: 125 },
    { id: "italy", x: 397, y: 130 },
    { id: "norway", x: 398, y: 112 },
  ];
  const offsets = markerOffsets(anchors, { width: 842, height: 390 });
  const centers = anchors.map((anchor) => ({
    x: anchor.x + offsets.get(anchor.id)!.x,
    y: anchor.y + offsets.get(anchor.id)!.y,
  }));
  for (let a = 0; a < centers.length; a++)
    for (let b = a + 1; b < centers.length; b++) {
      assert.ok(
        Math.abs(centers[a].x - centers[b].x) >= 48 ||
          Math.abs(centers[a].y - centers[b].y) >= 48,
      );
    }
});

test("verified Dolomites nodes remain separately tappable at country-click zoom", () => {
  const worldSize = 512 * 2 ** engineZoom(3.5);
  const mercatorY = (latitude: number) =>
    Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
  const anchors = getMapNodes(travelPlaces, "location")
    .filter((node) => node.collectionId === "italy")
    .map((node) => ({
      id: node.id,
      x: 195 + ((node.coordinates[0] - 12.08) / 360) * worldSize,
      y:
        300 -
        ((mercatorY(node.coordinates[1]) - mercatorY(46.7)) / (2 * Math.PI)) *
          worldSize,
    }));
  const offsets = markerOffsets(anchors, { width: 390, height: 844 });
  const centers = anchors.map((anchor) => ({
    x: anchor.x + offsets.get(anchor.id)!.x,
    y: anchor.y + offsets.get(anchor.id)!.y,
  }));
  assert.equal(centers.length, 4);
  for (let a = 0; a < centers.length; a++)
    for (let b = a + 1; b < centers.length; b++) {
      assert.ok(
        Math.abs(centers[a].x - centers[b].x) >= 48 ||
          Math.abs(centers[a].y - centers[b].y) >= 48,
      );
    }
});
