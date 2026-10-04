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
  apparentZoom,
  cameraZoom,
  constrainCamera,
  engineZoom,
  markerLevel,
  isZoomInput,
  isFlatFloorZoomOut,
  projectionMode,
  projectionStateKey,
  takeZoomIntent,
  settleProjection,
  uiZoom,
  viewportZoomOffset,
} from "../src/lib/map-camera";

test("MapLibre projection follows explicit state, independent of raw zoom and latitude compensation", () => {
  const state = { [projectionStateKey]: 0 };
  const parsed = expression.createPropertyExpression(
    continuousProjection.type,
    "projection",
    latest.projection.type as StylePropertySpecification,
    state,
  );
  assert.equal(parsed.result, "success");
  if (parsed.result !== "success") return;
  assert.equal(parsed.value.evaluate({ zoom: 0 }), "vertical-perspective");
  for (const zoom of [-3, 0, 0.5, 1, 5])
    assert.equal(parsed.value.evaluate({ zoom }), "vertical-perspective");
  state[projectionStateKey] = 0.5;
  const intermediate = parsed.value.evaluate({ zoom: 5 });
  assert.ok(intermediate instanceof ProjectionDefinition);
  assert.equal(intermediate.from, "vertical-perspective");
  assert.equal(intermediate.to, "mercator");
  assert.equal(intermediate.transition, 0.5);
  state[projectionStateKey] = 1;
  for (const zoom of [-3, 0, 0.5, 1, 5])
    assert.equal(parsed.value.evaluate({ zoom }), "mercator");
  state[projectionStateKey] = 0;
  assert.equal(parsed.value.evaluate({ zoom: 5 }), "vertical-perspective");
});

test("a latitude round trip preserves apparent sphere size and never crosses projection intent", () => {
  let rawZoom = 0;
  let latitude = 0;
  let mode: "globe" | "map" = "globe";
  for (const nextLatitude of [20, 47, 80, -80, 30, 0]) {
    // Native globe panning multiplies scale by cos(new latitude) / cos(old latitude).
    rawZoom += Math.log2(
      Math.cos((nextLatitude * Math.PI) / 180) /
        Math.cos((latitude * Math.PI) / 180),
    );
    latitude = nextLatitude;
    const constrained = constrainCamera(
      { lng: 370, lat: latitude },
      rawZoom,
      0,
    );
    const normalized = apparentZoom(constrained.zoom, latitude, 0);
    assert.ok(Math.abs(normalized) < 1e-10);
    mode = projectionMode(normalized, mode);
    assert.equal(mode, "globe");
    assert.equal(constrained.longitude, 370);
    const radius =
      (512 * 2 ** constrained.zoom) /
      (2 * Math.PI * Math.cos((latitude * Math.PI) / 180));
    assert.ok(Math.abs(radius - 512 / (2 * Math.PI)) < 1e-8);
  }
});

test("globe limits compensate latitude while flat limits retain world wrapping", () => {
  for (const latitude of [-85, -60, 0, 60, 85]) {
    const zoom = cameraZoom(0, latitude, 0);
    assert.equal(
      constrainCamera({ lng: -730, lat: latitude }, zoom, 0).zoom,
      zoom,
    );
    assert.equal(
      constrainCamera({ lng: -730, lat: latitude }, -10, 0).zoom,
      zoom,
    );
    assert.equal(constrainCamera({ lng: -730, lat: latitude }, -10, 1).zoom, 0);
    assert.ok(
      Math.abs(
        apparentZoom(cameraZoom(0.8, latitude, 0.35), latitude, 0.35) - 0.8,
      ) < 1e-10,
    );
  }
});

test("explicit zoom-out at the flat floor returns to globe without intercepting zoom-in or a blend", () => {
  assert.equal(isFlatFloorZoomOut(100, 0, 1, "map"), true);
  assert.equal(isFlatFloorZoomOut(-100, 0, 1, "map"), false);
  assert.equal(isFlatFloorZoomOut(0, 0, 1, "map"), false);
  assert.equal(isFlatFloorZoomOut(100, 0.2, 1, "map"), false);
  assert.equal(isFlatFloorZoomOut(100, 0, 0.99, "map"), false);
  assert.equal(isFlatFloorZoomOut(100, 0, 0, "globe"), false);
});

test("globe destination admits a negative raw target before the first blend frame and restores flat floor on interruption", () => {
  const latitude = 80;
  const target = cameraZoom(0, latitude, 0);
  assert.equal(
    constrainCamera({ lng: 0, lat: latitude }, target, 1, "globe").zoom,
    target,
  );
  assert.equal(
    constrainCamera({ lng: 0, lat: latitude }, target, 1, "map").zoom,
    0,
  );
});

test("projection intent has hysteresis and ignores drag, inertia, and arrow-key pan events", () => {
  assert.equal(projectionMode(0.89, "globe"), "globe");
  assert.equal(projectionMode(0.9, "globe"), "map");
  assert.equal(projectionMode(0.61, "map"), "map");
  assert.equal(projectionMode(0.6, "map"), "globe");
  for (const type of ["mousemove", "mouseup", "touchend", "pointermove"])
    assert.equal(isZoomInput({ type }), false);
  assert.equal(isZoomInput({ type: "keydown", key: "ArrowUp" }), false);
  assert.equal(
    isZoomInput({ type: "touchmove", touches: { length: 1 } }),
    false,
  );
  assert.equal(
    isZoomInput({ type: "touchmove", touches: { length: 2 } }),
    true,
  );
  assert.equal(isZoomInput({ type: "wheel" }), true);
  assert.equal(isZoomInput({ type: "keydown", key: "+" }), true);
});

test("event-less wheel completion consumes intent once; cancellation prevents a later pan consuming it", () => {
  const intent = { active: false };
  // MapLibre's delayed isolated wheel omits originalEvent even on zoomstart.
  intent.active = isZoomInput(undefined, true);
  assert.equal(takeZoomIntent(intent), true);
  assert.equal(takeZoomIntent(intent), false);

  intent.active = isZoomInput({ type: "wheel" });
  // Explicit camera requests and new pointer gestures cancel before native stop/end events.
  intent.active = false;
  assert.equal(takeZoomIntent(intent), false);
  assert.equal(isZoomInput({ type: "mouseup" }), false);
  assert.equal(isZoomInput({ type: "mouseup" }, true), false);
  assert.equal(isZoomInput({ type: "keydown", key: "ArrowUp" }, true), false);
  assert.equal(isZoomInput(undefined, false), false);
  assert.equal(takeZoomIntent(intent), false);
  intent.active = isZoomInput({ type: "touchmove", touches: { length: 2 } });
  assert.equal(takeZoomIntent(intent), true);
  assert.equal(takeZoomIntent(intent), false);
});

test("interrupting either projection direction preserves apparent zoom through subsequent latitude pans", () => {
  for (const latitude of [-80, -60, 0, 60, 80]) {
    for (const mix of [0.01, 0.49, 0.51, 0.99]) {
      const scale = 0.8;
      const settled = settleProjection(
        cameraZoom(scale, latitude, mix),
        latitude,
        mix,
      );
      assert.ok(Math.abs(settled.scale - scale) < 1e-10);
      assert.ok(
        Math.abs(apparentZoom(settled.zoom, latitude, settled.mix) - scale) <
          1e-10,
      );
      let rawZoom = settled.zoom;
      let previousLatitude = latitude;
      for (const nextLatitude of [30, -30, 75, latitude]) {
        if (settled.mode === "globe")
          rawZoom += Math.log2(
            Math.cos((nextLatitude * Math.PI) / 180) /
              Math.cos((previousLatitude * Math.PI) / 180),
          );
        previousLatitude = nextLatitude;
        const camera = constrainCamera(
          { lng: 370, lat: nextLatitude },
          rawZoom,
          settled.mix,
        );
        assert.ok(
          Math.abs(
            apparentZoom(camera.zoom, nextLatitude, settled.mix) - scale,
          ) < 1e-10,
        );
      }
    }
  }
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
  const fittedZoom = 3.2;
  const fittedThreshold = fittedZoom - 0.2;
  assert.equal(markerLevel(fittedZoom, "country", fittedThreshold), "location");
  assert.equal(
    markerLevel(fittedZoom - 0.25, "location", fittedThreshold),
    "location",
  );
  assert.equal(
    markerLevel(fittedZoom - 0.4, "location", fittedThreshold),
    "country",
  );
});

test("desktop globe spans 60% of the short side; phones keep the base zoom", () => {
  assert.equal(viewportZoomOffset(390, 844), 0);
  const offset = viewportZoomOffset(2000, 1258);
  assert.ok(Math.abs((512 / Math.PI) * 2 ** offset - 0.6 * 1258) < 0.001);
});

test("a settled flat map never shows its top or bottom edge", () => {
  const height = 1258;
  for (const lat of [-85, -60, 0, 70, 85]) {
    for (const zoom of [0, 1.5, 3]) {
      const camera = constrainCamera(
        { lng: 0, lat },
        zoom,
        1,
        "map",
        0,
        height,
      );
      const world = 512 * 2 ** camera.zoom;
      assert.ok(world >= height - 0.001);
      const y =
        (1 -
          Math.log(Math.tan(Math.PI / 4 + (camera.latitude * Math.PI) / 360)) /
            Math.PI) /
        2;
      assert.ok(y * world >= height / 2 - 0.001, `top edge at ${lat}, ${zoom}`);
      assert.ok(
        (1 - y) * world >= height / 2 - 0.001,
        `bottom edge at ${lat}, ${zoom}`,
      );
    }
  }
  // The globe is a sphere: no flat-map clamp applies to it.
  assert.equal(
    constrainCamera({ lng: 0, lat: 80 }, 1, 0, "globe", 0, height).latitude,
    80,
  );
});

test("flat map returns to the globe at its fill floor", () => {
  assert.equal(projectionMode(0.74, "map", 0.72), "globe");
  assert.equal(projectionMode(0.9, "globe", 0.72), "map");
});
