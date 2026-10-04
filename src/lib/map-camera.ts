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

// The default Mercator viewport-height minimum otherwise traps tall screens above the globe stop.
export function constrainCamera(
  center: { lng: number; lat: number },
  zoom: number,
) {
  return {
    longitude: center.lng,
    latitude: Math.max(-85, Math.min(85, center.lat)),
    zoom: Math.max(0, Math.min(12, zoom)),
  };
}

// One transform owns both projections, including the intermediate pinch frames.
export const continuousProjection: NonNullable<
  StyleSpecification["projection"]
> = {
  type: [
    "interpolate",
    ["linear"],
    ["zoom"],
    0,
    "vertical-perspective",
    engineZoom(1),
    "mercator",
  ],
};

export type MarkerLevel = "country" | "location";
export function markerLevel(zoom: number, previous: MarkerLevel): MarkerLevel {
  const threshold = engineZoom(3);
  if (previous === "country" && zoom >= threshold + 0.12) return "location";
  if (previous === "location" && zoom < threshold - 0.12) return "country";
  return previous;
}

type ScreenAnchor = { id: string; x: number; y: number; priority?: boolean };
export type MarkerOffset = { x: number; y: number };

const candidates: readonly MarkerOffset[] = [
  { x: 0, y: -28 },
  { x: 0, y: 28 },
  { x: -28, y: 0 },
  { x: 28, y: 0 },
  { x: -28, y: -28 },
  { x: 28, y: -28 },
  { x: -28, y: 28 },
  { x: 28, y: 28 },
];

/** Screen-space callouts never alter the geographic anchor or native occlusion. */
export function markerOffsets(
  anchors: readonly ScreenAnchor[],
  viewport: { width: number; height: number },
): Map<string, MarkerOffset> {
  const result = new Map<string, MarkerOffset>();
  const placed = new Map<string, { x: number; y: number }>();
  const sorted = [...anchors].sort(
    (a, b) =>
      Number(Boolean(b.priority)) - Number(Boolean(a.priority)) ||
      a.id.localeCompare(b.id),
  );
  function place(anchor: ScreenAnchor) {
    let best = candidates[0];
    let lowest = Infinity;
    for (const offset of candidates) {
      const x = anchor.x + offset.x;
      const y = anchor.y + offset.y;
      let overlap = 0;
      for (const [id, other] of placed) {
        if (id !== anchor.id)
          overlap +=
            Math.max(0, 52 - Math.abs(x - other.x)) *
            Math.max(0, 52 - Math.abs(y - other.y));
      }
      const outside =
        Math.max(0, 26 - x) +
        Math.max(0, x + 26 - viewport.width) +
        Math.max(0, 26 - y) +
        Math.max(0, y + 26 - viewport.height);
      const score =
        overlap * 100 + outside * 1000 + Math.hypot(offset.x, offset.y);
      if (score < lowest) {
        lowest = score;
        best = offset;
      }
    }
    result.set(anchor.id, best);
    placed.set(anchor.id, { x: anchor.x + best.x, y: anchor.y + best.y });
  }
  for (const anchor of sorted) place(anchor);
  // Relax early choices after all neighbors are known, keeping every leader under 40px.
  for (let pass = 0; pass < 2; pass++)
    for (const anchor of sorted) place(anchor);
  return result;
}

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
