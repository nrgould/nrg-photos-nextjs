import { engineZoom } from "../src/lib/map-camera";
import { getMapNodes } from "../src/lib/map-hierarchy";
import { travelPlaces } from "../src/lib/places";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clusterMapNodes,
  layoutMapMarkers,
  markerTargetVisible,
  type MarkerAnchor,
  type MarkerLayout,
} from "../src/lib/map-marker-layout";

const viewport = { width: 390, height: 844 };
const dolomites: MarkerAnchor[] = [
  { id: "braies", x: 195, y: 300 },
  { id: "seceda", x: 168.21, y: 311.15 },
  { id: "santa-magdalena", x: 166.68, y: 306.69 },
  { id: "cadini", x: 211.07, y: 312.26 },
];
function assertSeparated(
  anchors: readonly MarkerAnchor[],
  layout: MarkerLayout,
) {
  assert.deepEqual(layout.unresolvedIds, []);
  for (let a = 0; a < anchors.length; a++)
    for (let b = a + 1; b < anchors.length; b++) {
      const offsetA = layout.offsets.get(anchors[a].id)!;
      const offsetB = layout.offsets.get(anchors[b].id)!;
      assert.ok(
        Math.abs(anchors[a].x + offsetA.x - anchors[b].x - offsetB.x) >= 48 ||
          Math.abs(anchors[a].y + offsetA.y - anchors[b].y - offsetB.y) >= 48,
        `${anchors[a].id} overlaps ${anchors[b].id}`,
      );
    }
  for (const offset of layout.offsets.values())
    assert.ok(Math.hypot(offset.x, offset.y) < 43);
}

test("joint rest layout separates the four nearby Dolomites targets with short leaders", () => {
  const layout = layoutMapMarkers({ anchors: dolomites, viewport });
  assertSeparated(dolomites, layout);
  assert.deepEqual(
    layoutMapMarkers({ anchors: [...dolomites].reverse(), viewport }).offsets,
    layout.offsets,
  );
});

test("globe country layout separates three neighboring targets", () => {
  const anchors = [
    { id: "austria", x: 400, y: 125 },
    { id: "italy", x: 397, y: 130 },
    { id: "norway", x: 398, y: 112 },
  ];
  assertSeparated(
    anchors,
    layoutMapMarkers({ anchors, viewport: { width: 842, height: 390 } }),
  );
});

test("pan and pinch frames retain all assignments even when anchors collide temporarily", () => {
  const initial = layoutMapMarkers({ anchors: dolomites, viewport });
  const original = structuredClone(initial);
  let previous = initial;
  for (let frame = 0; frame < 90; frame++) {
    const anchors = dolomites.map((anchor, index) => ({
      ...anchor,
      x: 100 + (index * frame) / 10,
      y: 200 + frame,
      priority: index === frame % 4,
    }));
    previous = layoutMapMarkers({ anchors, viewport, previous, moving: true });
    assert.deepEqual(previous.offsets, initial.offsets);
  }
  assert.deepEqual(initial, original);
});

test("small settled anchor movements preserve valid assignments instead of chasing lower costs", () => {
  const anchors = [
    { id: "a", x: 150, y: 200 },
    { id: "b", x: 204, y: 200 },
  ];
  const initial = layoutMapMarkers({ anchors, viewport });
  const shifted = [
    { ...anchors[0], priority: true },
    { ...anchors[1], x: 201 },
  ];
  const settled = layoutMapMarkers({
    anchors: shifted,
    viewport,
    previous: initial,
  });
  assert.deepEqual(settled.offsets, initial.offsets);
  assertSeparated(shifted, settled);
});

test("a new member during motion never moves surviving callouts; removal drops only its own assignment", () => {
  const initial = layoutMapMarkers({
    anchors: dolomites.slice(0, 2),
    viewport,
  });
  const expanded = layoutMapMarkers({
    anchors: dolomites,
    viewport,
    previous: initial,
    moving: true,
  });
  for (const [id, offset] of initial.offsets)
    assert.deepEqual(expanded.offsets.get(id), offset);
  const removed = layoutMapMarkers({
    anchors: [dolomites[0]],
    viewport,
    previous: expanded,
    moving: true,
  });
  assert.equal(removed.offsets.size, 1);
  assert.deepEqual(
    removed.offsets.get("braies"),
    initial.offsets.get("braies"),
  );
  assertSeparated(
    dolomites,
    layoutMapMarkers({ anchors: dolomites, viewport, previous: expanded }),
  );
});

test("occluded globe anchors and offscreen markers do not displace visible targets", () => {
  const anchors = [
    { id: "front", x: 195, y: 300 },
    { id: "back", x: 195, y: 300, visible: false },
    { id: "offscreen", x: -1000, y: 300 },
  ];
  const layout = layoutMapMarkers({ anchors, viewport });
  assert.deepEqual(layout.unresolvedIds, []);
  assert.deepEqual(layout.offsets.get("front"), { x: 0, y: -28 });
});

test("impossible density is explicit instead of moving anchors or hiding interactive targets", () => {
  const anchors = Array.from({ length: 6 }, (_, index) => ({
    id: String(index),
    x: 195,
    y: 300,
  }));
  const snapshot = structuredClone(anchors);
  const layout = layoutMapMarkers({ anchors, viewport });
  assert.ok(layout.unresolvedIds.length > 0);
  assert.equal(layout.offsets.size, anchors.length);
  assert.deepEqual(anchors, snapshot);
  for (const offset of layout.offsets.values())
    assert.ok(Math.hypot(offset.x, offset.y) < 43);
});

test("empty membership removes previous assignments", () => {
  const previous = layoutMapMarkers({ anchors: dolomites, viewport });
  assert.equal(
    layoutMapMarkers({ anchors: [], viewport, previous }).offsets.size,
    0,
  );
});

test("an unrelated new marker cannot reshuffle an already valid nearby group", () => {
  const wideViewport = { width: 900, height: 640 };
  const anchors = [
    { id: "a", x: 150, y: 200 },
    { id: "b", x: 204, y: 200 },
  ];
  const initial = layoutMapMarkers({ anchors, viewport: wideViewport });
  const narrowed = [{ ...anchors[0] }, { ...anchors[1], x: 200 }];
  const settled = layoutMapMarkers({
    anchors: narrowed,
    viewport: wideViewport,
    previous: initial,
  });
  const added = layoutMapMarkers({
    anchors: [...narrowed, { id: "far", x: 750, y: 400 }],
    viewport: wideViewport,
    previous: settled,
  });
  for (const [id, offset] of settled.offsets)
    assert.deepEqual(added.offsets.get(id), offset);
});

test("dense places cluster until every drawn marker is separately tappable at country-click zoom", () => {
  const mercatorY = (latitude: number) =>
    Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
  for (const country of ["italy", "germany"])
    for (const scale of [1, 4 / 3]) {
      const zoom = engineZoom(3.5);
      const worldSize = (512 * 2 ** zoom) / scale;
      const places = getMapNodes(travelPlaces, "location").filter(
        (node) => node.collectionId === country,
      );
      const drawn = clusterMapNodes(places, zoom, scale);
      assert.ok(drawn.some((node) => node.kind === "cluster"));
      assert.deepEqual(
        drawn.flatMap((node) => node.photos.map((photo) => photo.src)).sort(),
        places.flatMap((node) => node.photos.map((photo) => photo.src)).sort(),
      );
      const [longitude, latitude] = drawn[0].coordinates;
      const anchors = drawn.map((node) => ({
        id: node.id,
        x: 195 + ((node.coordinates[0] - longitude) / 360) * worldSize,
        y:
          422 -
          ((mercatorY(node.coordinates[1]) - mercatorY(latitude)) /
            (2 * Math.PI)) *
            worldSize,
      }));
      assertSeparated(anchors, layoutMapMarkers({ anchors, viewport }));
    }
});

test("clusters split once the camera zooms in", () => {
  const italy = getMapNodes(travelPlaces, "location").filter(
    (node) => node.collectionId === "italy",
  );
  assert.deepEqual(clusterMapNodes(italy, engineZoom(10)), italy);
  const cluster = clusterMapNodes(italy, engineZoom(3.5)).find(
    (node) => node.kind === "cluster",
  )!;
  assert.ok(cluster.memberIds!.includes("location:tre-cime-di-lavaredo"));
  assert.equal(
    cluster.photoCount,
    italy
      .filter((node) => cluster.memberIds!.includes(node.id))
      .reduce((sum, node) => sum + node.photoCount, 0),
  );
});

test("only rendered targets intersecting the viewport are keyboard accessible", () => {
  const view = { left: 20, top: 50, right: 410, bottom: 894 };
  const visible = { left: 160, top: 200, right: 208, bottom: 248 };
  assert.equal(markerTargetVisible(visible, view), true);
  assert.equal(markerTargetVisible(visible, view, true), false);
  for (const target of [
    { left: 703, top: -3206, right: 751, bottom: -3158 },
    { left: -28, top: 200, right: 20, bottom: 248 },
    { left: 410, top: 200, right: 458, bottom: 248 },
    { left: 160, top: 2, right: 208, bottom: 50 },
    { left: 160, top: 894, right: 208, bottom: 942 },
    { ...visible, right: NaN },
    { ...visible, right: Infinity },
    { ...visible, right: visible.left },
  ])
    assert.equal(markerTargetVisible(target, view), false);
  assert.equal(
    markerTargetVisible({ left: -27, top: 200, right: 21, bottom: 248 }, view),
    true,
  );
});
