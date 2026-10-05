import countryLabels from "../data/country-labels.json";
import type { Photo } from "./photography";
import {
  locationPath,
  locations,
  photoLocations,
  type LocationNode,
  type TravelPlace,
} from "./places";

export type MapNodeKind = "country" | "location";
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
};

const countries = locations.filter((node) => !node.parent);

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
  const country = countries.find(
    (entry) => `country:${entry.id}` === countryId,
  );
  const place = places.find((entry) => entry.id === country?.id);
  if (!place?.photos.length) return null;
  return getCoordinateBounds(
    place.photos.flatMap((photo) => {
      const coordinates = placeFor(photo.src)?.coordinates;
      return coordinates ? [coordinates] : [];
    }),
  );
}

function boundsCenter(bounds: MapChildBounds): [number, number] {
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
    const base = { collectionId: place.id, countryId: `country:${country.id}` };
    if (kind === "country") {
      const bounds = getCountryChildBounds(base.countryId, places);
      const hasUnknownLocations = place.photos.some(
        (photo) => !placeFor(photo.src),
      );
      return [
        {
          ...base,
          id: base.countryId,
          kind,
          label: country.name,
          coordinates: bounds
            ? boundsCenter(bounds)
            : countryCoordinates(country),
          photos: [...place.photos],
          photoCount: place.photos.length,
          cover: place.photos[0],
          precision: "country",
          referenceLabel: bounds
            ? `${country.name} photographed-region cluster reference${hasUnknownLocations ? " · unknown photo locations excluded" : ""}`
            : `${country.name} country reference · no verified photo locations`,
        } satisfies MapNode,
      ];
    }
    const groups = Map.groupBy(place.photos, (photo) => placeFor(photo.src));
    const nodes = locations.flatMap((reference): MapNode[] => {
      const photos = groups.get(reference);
      if (!photos || !reference.coordinates) return [];
      return [
        {
          ...base,
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
        ...base,
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

/** A filtered-out leaf stays absent even if its parent collection still has photos. */
export function getMapNode(
  id: string | null,
  places: TravelPlace[],
): MapNode | null {
  if (!id) return null;
  const kind = id.startsWith("country:") ? "country" : "location";
  return getMapNodes(places, kind).find((node) => node.id === id) ?? null;
}
