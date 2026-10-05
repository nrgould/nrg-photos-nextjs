import countryLabels from "../data/country-labels.json";
import type { Photo } from "./photography";
import { presetCatalog } from "./preset-commerce";
import {
  locationPath,
  locations,
  photoLocations,
  photoPresets,
  type LocationNode,
  type TravelPlace,
} from "./places";

/** A cluster is drawn only where location pins cannot be separated; see clusterMapNodes. */
export type MapNodeKind = "country" | "location" | "cluster";
export type MapNode = {
  id: string;
  kind: MapNodeKind;
  label: string;
  /** Representative area reference in [longitude, latitude], never camera GPS. */
  coordinates: [number, number];
  collectionId: string;
  countryId: string;
  photos: Photo[];
  photoCount: number;
  cover: Photo;
  precision: "country" | "regional" | "unknown";
  referenceLabel: string;
  /** Cluster only: the location node ids it stands for. */
  memberIds?: string[];
};

const countries = locations.filter((node) => !node.parent);

/** Too large for one top-level stack: their regions (states) stand in for the country. */
const regionalCountries = new Set(["united-states"]);
/** A photo's top-level map unit: its country, or its state for a regional country. */
function unitFor(src: string, country: LocationNode) {
  const id = photoLocations.get(src);
  return (
    (regionalCountries.has(country.id) && id && locationPath(id)[1]) || country
  );
}

/** The map's pin for a photo: the place level (country, region, place) of its location. */
function placeFor(src: string) {
  const id = photoLocations.get(src);
  const place = id ? locationPath(id)[2] : undefined;
  return place?.coordinates ? place : undefined;
}

function countryCoordinates(country: LocationNode): [number, number] {
  const feature = countryLabels.features.find(
    (entry) => entry.properties.id === country.naturalEarthId,
  );
  if (!feature)
    throw new Error(`Missing country reference: ${country.naturalEarthId}`);
  return [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];
}

export type MapChildBounds = [[number, number], [number, number]];

/** Shortest wrapped longitude extent; east may exceed 180 across the dateline. */
export function getCoordinateBounds(
  coordinates: readonly (readonly [number, number])[],
): MapChildBounds | null {
  if (!coordinates.length) return null;
  const longitude = (value: number) =>
    value >= -180 && value < 180
      ? value
      : ((((value + 180) % 360) + 360) % 360) - 180;
  const longitudes = coordinates
    .map(([value]) => longitude(value))
    .sort((a, b) => a - b);
  let gapIndex = 0;
  let largestGap = -1;
  for (let index = 0; index < longitudes.length; index++) {
    const next =
      index === longitudes.length - 1
        ? longitudes[0] + 360
        : longitudes[index + 1];
    const gap = next - longitudes[index];
    if (gap > largestGap) {
      largestGap = gap;
      gapIndex = index;
    }
  }
  const west = longitudes[(gapIndex + 1) % longitudes.length];
  const east =
    longitudes[gapIndex] < west
      ? longitudes[gapIndex] + 360
      : longitudes[gapIndex];
  return [
    [west, Math.min(...coordinates.map(([, latitude]) => latitude))],
    [east, Math.max(...coordinates.map(([, latitude]) => latitude))],
  ];
}

/** Eligible regional children only: country and unknown-location references do not fit the camera. */
export function getCountryChildBounds(
  countryId: string,
  places: TravelPlace[],
): MapChildBounds | null {
  const unit = locations.find(
    (entry) =>
      `country:${entry.id}` === countryId &&
      (!entry.parent || regionalCountries.has(entry.parent)),
  );
  const country = unit && locationPath(unit.id)[0];
  const place = places.find((entry) => entry.id === country?.id);
  if (!place?.photos.length) return null;
  return getCoordinateBounds(
    place.photos.flatMap((photo) => {
      const coordinates = placeFor(photo.src)?.coordinates;
      return coordinates && unitFor(photo.src, country!) === unit
        ? [coordinates]
        : [];
    }),
  );
}

export function boundsCenter(bounds: MapChildBounds): [number, number] {
  const longitude = (bounds[0][0] + bounds[1][0]) / 2;
  return [
    longitude >= 180 ? longitude - 360 : longitude,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
}

/** Derive every marker, count and cover from the same already-filtered collections. */
export function getMapNodes(
  places: TravelPlace[],
  kind: MapNodeKind,
): MapNode[] {
  return countries.flatMap((country) => {
    const place = places.find((entry) => entry.id === country.id);
    if (!place?.photos.length) return [];
    const unitId = (photos: Photo[]) =>
      `country:${unitFor(photos[0].src, country).id}`;
    if (kind === "country")
      return [
        ...Map.groupBy(place.photos, (photo) => unitFor(photo.src, country)),
      ].map(([unit, photos]): MapNode => {
        const id = `country:${unit.id}`;
        const bounds = getCountryChildBounds(id, [{ ...place, photos }]);
        const hasUnknownLocations = photos.some(
          (photo) => !placeFor(photo.src),
        );
        return {
          collectionId: place.id,
          countryId: id,
          id,
          kind,
          label: unit.name,
          coordinates: bounds
            ? boundsCenter(bounds)
            : countryCoordinates(country),
          photos: [...photos],
          photoCount: photos.length,
          cover: photos[0],
          precision: "country",
          referenceLabel: bounds
            ? `${unit.name} photographed-region cluster reference${hasUnknownLocations ? " · unknown photo locations excluded" : ""}`
            : `${unit.name} country reference · no verified photo locations`,
        };
      });
    const groups = Map.groupBy(place.photos, (photo) => placeFor(photo.src));
    const nodes = locations.flatMap((reference): MapNode[] => {
      const photos = groups.get(reference);
      if (!photos || !reference.coordinates) return [];
      return [
        {
          collectionId: place.id,
          countryId: unitId(photos),
          id: `location:${reference.id}`,
          kind,
          label: reference.name,
          coordinates: [...reference.coordinates],
          referenceLabel:
            reference.reference ?? `${reference.name} area reference`,
          photos,
          photoCount: photos.length,
          cover: photos[0],
          precision: "regional",
        },
      ];
    });
    const unlocated = groups.get(undefined);
    if (unlocated)
      nodes.push({
        collectionId: place.id,
        countryId: unitId(unlocated),
        id: `location:${place.id}-unlocated`,
        kind,
        label: `${country.name} · location unknown`,
        coordinates: countryCoordinates(country),
        referenceLabel: `${country.name} collection reference · photo location unknown`,
        photos: unlocated,
        photoCount: unlocated.length,
        cover: unlocated[0],
        precision: "unknown",
      });
    return nodes;
  });
}

/** Places with photographs edited with a preset, each holding only those photographs. */
export function getPresetPlaces(places: TravelPlace[], presetId: string) {
  return getMapNodes(places, "location").flatMap((node) => {
    const photos = node.photos.filter(
      (photo) => photoPresets.get(photo.src) === presetId,
    );
    return photos.length
      ? [{ ...node, photos, photoCount: photos.length, cover: photos[0] }]
      : [];
  });
}

const within = (id: string, ancestorId: string) =>
  locationPath(id).some((node) => node.id === ancestorId);
const photoWithin = (photo: Photo, ancestorId: string) => {
  const id = photoLocations.get(photo.src);
  return id !== undefined && within(id, ancestorId);
};

/** Where a location opens: its one map place, or the country listing a region's places. */
export function getLocationNode(places: TravelPlace[], locationId: string) {
  const holds = (node: MapNode) =>
    node.photos.some((photo) => photoWithin(photo, locationId));
  const leaves = getMapNodes(places, "location").filter(holds);
  if (leaves.length < 2) return leaves[0] ?? null;
  return getMapNodes(places, "country").find(holds) ?? null;
}

/** Presets made at a map place or its region, or edited onto its photographs, in catalog order. */
export function getPlacePresets(node: MapNode) {
  if (node.precision !== "regional") return [];
  const placeId = node.id.slice("location:".length);
  const edited = new Set(
    node.photos.map((photo) => photoPresets.get(photo.src)),
  );
  return presetCatalog.filter(
    (preset) =>
      edited.has(preset.id) ||
      within(placeId, preset.location) ||
      within(preset.location, placeId),
  );
}

/** A filtered-out leaf stays absent even if its parent collection still has photos. */
export function getMapNode(
  id: string | null,
  places: TravelPlace[],
): MapNode | null {
  if (!id) return null;
  const kind = id.startsWith("country:") ? "country" : "location";
  return getMapNodes(places, kind).find((node) => node.id === id) ?? null;
}
