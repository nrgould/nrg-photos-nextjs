import { test } from "node:test";
import assert from "node:assert/strict";
import Point from "@mapbox/point-geometry";
import {
  apparentZoom,
  cameraZoom,
  constrainCamera,
} from "../src/lib/map-camera";

test("installed MapLibre prepares a high-latitude reverse target before its first projection frame", async () => {
  // Load the pinned engine's real camera helper without adding its source tree to the app typecheck.
  const source = new URL(
    "../node_modules/maplibre-gl/src/geo/",
    import.meta.url,
  );
  const { MercatorTransform } = await import(
    new URL("projection/mercator_transform.ts", source).href
  );
  const { MercatorCameraHelper } = await import(
    new URL("projection/mercator_camera_helper.ts", source).href
  );
  const { LngLat } = await import(new URL("lng_lat.ts", source).href);
  const transform = new MercatorTransform();
  let mix = 1;
  transform.setConstrainOverride(
    (center: { lng: number; lat: number }, zoom: number) => {
      const camera = constrainCamera(center, zoom, mix, "globe");
      return {
        center: new LngLat(camera.longitude, camera.latitude),
        zoom: camera.zoom,
      };
    },
  );
  transform.resize(1000, 700);
  transform.setCenter(new LngLat(0, 80));
  transform.setZoom(0.5);
  assert.equal(transform.center.lat, 80);
  const rawTarget = cameraZoom(0, 80, 0);
  const transition = new MercatorCameraHelper().handleEaseTo(transform, {
    zoom: rawTarget,
    center: transform.center,
    offset: [0, 0],
    offsetAsPoint: new Point(0, 0),
    padding: transform.padding,
    bearing: 0,
    pitch: 0,
    roll: 0,
  });
  mix = 0;
  transition.easeFunc(1);
  assert.ok(Math.abs(transform.center.lat - 80) < 1e-10);
  assert.ok(Math.abs(transform.zoom - rawTarget) < 1e-10);
  assert.ok(
    Math.abs(apparentZoom(transform.zoom, transform.center.lat, 0)) < 1e-10,
  );
});
