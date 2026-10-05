import type { StyleSpecification } from "maplibre-gl";

const zoomStops = [
  [0, 0],
  [1, 1],
  [2, 3],
  [3, 5],
  [5, 8],
  [10, 12],
] as const;
function interpolateZoom(value: number, input: 0 | 1) {
  const output = input === 0 ? 1 : 0;
  const bounded = Math.max(0, Math.min(zoomStops.at(-1)![input], value));
  for (let index = 1; index < zoomStops.length; index++) {
    const start = zoomStops[index - 1];
    const end = zoomStops[index];
    if (bounded <= end[input])
      return (
        start[output] +
        ((bounded - start[input]) / (end[input] - start[input])) *
          (end[output] - start[output])
      );
  }
  return zoomStops.at(-1)![output];
}
export const engineZoom = (scale: number) => interpolateZoom(scale, 0);
export const uiZoom = (zoom: number) => interpolateZoom(zoom, 1);

export type ProjectionMode = "globe" | "map";
export const projectionStateKey = "photoProjectionMix";
export const projectionDuration = 0.24;

/** MapLibre preserves globe radius by changing raw zoom as the center latitude changes. */
export function globeLatitudeZoom(latitude: number) {
  return Math.log2(
    Math.cos((Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180),
  );
}
export function apparentZoom(rawZoom: number, latitude: number, mix: number) {
  return rawZoom - (1 - mix) * globeLatitudeZoom(latitude);
}
export function cameraZoom(scale: number, latitude: number, mix: number) {
  return scale + (1 - mix) * globeLatitudeZoom(latitude);
}
export function settleProjection(
  rawZoom: number,
  latitude: number,
  mix: number,
) {
  const scale = Math.max(0, apparentZoom(rawZoom, latitude, mix));
  const endpoint = mix < 0.5 ? 0 : 1;
  return {
    mode: endpoint === 0 ? ("globe" as const) : ("map" as const),
    mix: endpoint,
    scale,
    zoom: cameraZoom(scale, latitude, endpoint),
  };
}
/** `mapFloor` is the lowest zoom where a flat map still covers the viewport. */
export function projectionMode(
  scale: number,
  previous: ProjectionMode,
  mapFloor = 0,
): ProjectionMode {
  if (previous === "globe" && scale >= Math.max(0.9, mapFloor + 0.15))
    return "map";
  if (previous === "map" && scale <= Math.max(0.6, mapFloor + 0.02))
    return "globe";
  return previous;
}

/** Zoom in until the globe spans 60% of the viewport's short side; a phone's runs past its width, 60% of its height. */
export function viewportZoomOffset(width: number, height: number) {
  const span = 0.6 * (width <= 700 ? height : Math.min(width, height));
  return Math.max(0, Math.log2((span * Math.PI) / 512));
}

/** Zoom at which the flat map's full height fills the viewport. */
export const mapFillZoom = (height: number) => Math.log2(height / 512);
export function isZoomInput(
  event:
    { type: string; key?: string; touches?: { length: number } } | undefined,
  scrollZooming = false,
) {
  // The delayed single-wheel path omits originalEvent; a known pan event never qualifies.
  if (!event) return scrollZooming;
  if (event.type === "wheel" || event.type === "dblclick") return true;
  if (event.type === "keydown")
    return ["+", "=", "-", "_"].includes(event.key ?? "");
  return event.type === "touchmove" && (event.touches?.length ?? 0) >= 2;
}

/** Every end consumes the gesture, including an end caused by a camera interruption. */
export function takeZoomIntent(intent: { active: boolean }) {
  const active = intent.active;
  intent.active = false;
  return active;
}

export function isFlatFloorZoomOut(
  delta: number,
  zoom: number,
  mix: number,
  mode: ProjectionMode,
  floor = 0,
) {
  return delta > 0 && mode === "map" && mix === 1 && zoom <= floor + 0.0001;
}

const mercatorY = (latitude: number) =>
  (1 - Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360)) / Math.PI) /
  2;
const mercatorLatitude = (y: number) =>
  (360 / Math.PI) * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - 90;

// Keep the native latitude-adjusted globe minimum, without Mercator's viewport-height floor.
// The flat map never shows its top or bottom edge: with `viewportHeight`, a
// settled map keeps the world filling the viewport vertically.
export function constrainCamera(
  center: { lng: number; lat: number },
  zoom: number,
  mix = 1,
  destination: ProjectionMode = mix === 0 ? "globe" : "map",
  floor = 0,
  viewportHeight?: number,
) {
  let latitude = Math.max(-85, Math.min(85, center.lat));
  let next = Math.max(
    // Mercator's camera helper constrains the animation target before the first blend frame.
    cameraZoom(floor, latitude, destination === "globe" ? 0 : mix),
    Math.min(12 + floor, zoom),
  );
  if (viewportHeight && destination === "map" && mix === 1) {
    next = Math.max(next, mapFillZoom(viewportHeight));
    const half = viewportHeight / 2 / (512 * 2 ** next);
    latitude = mercatorLatitude(
      Math.max(half, Math.min(1 - half, mercatorY(latitude))),
    );
  }
  return { longitude: center.lng, latitude, zoom: next };
}

// One native transform; explicit intent animates this state, never latitude-dependent raw zoom.
export const continuousProjection: NonNullable<
  StyleSpecification["projection"]
> = {
  type: [
    "interpolate",
    ["linear"],
    ["number", ["global-state", projectionStateKey], 0],
    0,
    "vertical-perspective",
    1,
    "mercator",
  ],
};

export type MarkerLevel = "country" | "location";
// UI scale where country stacks split into places: halfway from Continent to Region.
export const breakoutScale = 2.5;
export function markerLevel(
  zoom: number,
  previous: MarkerLevel,
  threshold = engineZoom(breakoutScale),
): MarkerLevel {
  if (previous === "country" && zoom >= threshold + 0.12) return "location";
  if (previous === "location" && zoom < threshold - 0.12) return "country";
  return previous;
}

type ScreenAnchor = { id: string; x: number; y: number; priority?: boolean };
export type MarkerOffset = { x: number; y: number };

export function markerLabels(
  anchors: readonly ScreenAnchor[],
  offsets: ReadonlyMap<string, MarkerOffset>,
  widths: ReadonlyMap<string, number>,
) {
  type Box = { left: number; right: number; top: number; bottom: number };
  const overlaps = (a: Box, b: Box) =>
    a.left < b.right + 3 &&
    a.right + 3 > b.left &&
    a.top < b.bottom + 3 &&
    a.bottom + 3 > b.top;
  const photos = new Map(
    anchors.map((anchor) => {
      const offset = offsets.get(anchor.id)!;
      const x = anchor.x + offset.x,
        y = anchor.y + offset.y;
      return [
        anchor.id,
        { left: x - 24, right: x + 24, top: y - 24, bottom: y + 24 },
      ] as const;
    }),
  );
  const visible: Box[] = [];
  const result = new Map<
    string,
    { side: "above" | "below"; hidden: boolean }
  >();
  const sorted = [...anchors].sort(
    (a, b) =>
      Number(Boolean(b.priority)) - Number(Boolean(a.priority)) ||
      a.id.localeCompare(b.id),
  );
  for (const anchor of sorted) {
    const photo = photos.get(anchor.id)!;
    const width = widths.get(anchor.id) ?? 0;
    const preferred = offsets.get(anchor.id)!.y < 0 ? "above" : "below";
    const sides = [
      preferred,
      preferred === "above" ? "below" : "above",
    ] as const;
    let shown = false;
    for (const side of sides) {
      const top = side === "above" ? photo.top - 25 : photo.bottom + 4;
      const box = {
        left: (photo.left + photo.right - width) / 2,
        right: (photo.left + photo.right + width) / 2,
        top,
        bottom: top + 19,
      };
      if (
        !anchor.priority &&
        (visible.some((other) => overlaps(box, other)) ||
          [...photos.values()].some((other) => overlaps(box, other)))
      )
        continue;
      visible.push(box);
      result.set(anchor.id, { side, hidden: false });
      shown = true;
      break;
    }
    if (!shown) result.set(anchor.id, { side: preferred, hidden: true });
  }
  return result;
}
