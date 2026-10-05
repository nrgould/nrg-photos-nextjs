import locationTree from "../data/locations.json";
import manifest from "./photo-manifest.json";
import { allPhotos, type Photo } from "./photography";

export type LocationNode = {
  /** Stable: favorites and exploration progress persist it. Parents may change. */
  id: string;
  name: string;
  parent?: string;
  /** Representative area reference in [longitude, latitude], never camera GPS. */
  coordinates?: [number, number];
  coordinateSource?: "manual" | "geocoded";
  reference?: string;
  /** Countries only: label position in country-labels.json. */
  naturalEarthId?: string;
};
export type TravelPlace = {
  id: string;
  name: string;
  referenceLabel: string;
  /** Representative regional pin in [longitude, latitude], never camera GPS. */
  coordinates: [number, number];
  photos: Photo[];
};

// Depth-first, so siblings keep file order and every child follows its parent.
function depthFirst(nodes: LocationNode[], parent?: string): LocationNode[] {
  return nodes
    .filter((node) => node.parent === parent)
    .flatMap((node) => [node, ...depthFirst(nodes, node.id)]);
}
/** Country, region, place, sublocation. */
export const locations = depthFirst(locationTree as LocationNode[]);
const byId = new Map(locations.map((node) => [node.id, node]));

/** Country first, the node itself last. */
export function locationPath(id: string): LocationNode[] {
  const node = byId.get(id);
  if (!node) throw new Error(`Unknown location: ${id}`);
  return node.parent ? [...locationPath(node.parent), node] : [node];
}

type ManifestEntry = Pick<
  Photo,
  "src" | "alt" | "width" | "height" | "taken"
> & {
  title?: string;
  locationId?: string;
  hero?: boolean;
  lead?: boolean;
  /** The kept preset Lightroom last applied, from its develop history. */
  presetId?: string;
};
const entries = new Map(
  (manifest as ManifestEntry[]).map((entry) => [entry.src, entry]),
);
/** Where each map photograph was taken, keyed by src. */
export const photoLocations = new Map(
  [...entries.values()].flatMap((entry) =>
    entry.locationId ? [[entry.src, entry.locationId] as const] : [],
  ),
);

/** The preset each map photograph was edited with, keyed by src. */
export const photoPresets = new Map(
  [...entries.values()].flatMap((entry) =>
    entry.presetId ? [[entry.src, entry.presetId] as const] : [],
  ),
);

/** Photographs marked as a place's lead images. */
export const heroSrcs = new Set(
  [...entries.values()].filter((entry) => entry.hero).map((entry) => entry.src),
);
// Lead first, then the other heroes, then everything else.
const weight = (src: string) =>
  entries.get(src)?.lead ? 2 : Number(heroSrcs.has(src));

// Portfolio photographs keep their editorial titles; Lightroom ones carry theirs in the manifest.
const portfolio = new Map(allPhotos.map((photo) => [photo.src, photo]));
function mapPhoto(src: string, collection: string): Photo {
  const { title = "", alt, width, height, taken } = entries.get(src)!;
  return (
    portfolio.get(src) ?? { src, title, alt, width, height, collection, taken }
  );
}

const rank = (node: LocationNode) => locations.indexOf(node);
// ISO capture times sort as strings; undated photos go last.
const takenOrder = (a: string, b: string) =>
  (entries.get(a)?.taken ?? "~").localeCompare(entries.get(b)?.taken ?? "~");
// One collection per country, photos in tree order.
export const travelPlaces: TravelPlace[] = locations
  .filter((country) => !country.parent)
  .flatMap((country) => {
    const located = [...photoLocations]
      .filter(([, id]) => locationPath(id)[0] === country)
      // Tree order by map place, the lead and other heroes first, then the rest by capture time.
      .sort(
        ([srcA, a], [srcB, b]) =>
          rank(locationPath(a)[2] ?? byId.get(a)!) -
            rank(locationPath(b)[2] ?? byId.get(b)!) ||
          weight(srcB) - weight(srcA) ||
          (heroSrcs.has(srcA) ? 0 : takenOrder(srcA, srcB)),
      );
    const pin = located
      .map(([, id]) => locationPath(id)[2])
      .find((place) => place?.coordinates);
    if (!pin) return [];
    return [
      {
        id: country.id,
        name: country.name,
        referenceLabel: pin.reference ?? `${pin.name} area reference`,
        coordinates: pin.coordinates!,
        photos: located.map(([src]) => mapPhoto(src, country.id)),
      },
    ];
  });

export function shuffleIndex(
  current: number,
  count: number,
  random = Math.random(),
) {
  return count < 2
    ? current
    : (current +
        1 +
        Math.floor(Math.min(Math.max(random, 0), 0.999999) * (count - 1))) %
        count;
}
