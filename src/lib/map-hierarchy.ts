import countryLabels from "../data/country-labels.json";
import type { Photo } from "./photography";
import type { TravelPlace } from "./places";

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

type CountryReference = {
  id: string;
  collectionId: string;
  label: string;
  naturalEarthId: string;
};
const countries: CountryReference[] = [
  {
    id: "country:austria",
    collectionId: "austria",
    label: "Austria",
    naturalEarthId: "AUT",
  },
  {
    id: "country:italy",
    collectionId: "italy",
    label: "Italy",
    naturalEarthId: "ITA",
  },
  {
    id: "country:norway",
    collectionId: "norway",
    label: "Norway",
    naturalEarthId: "NOR",
  },
  {
    id: "country:united-states",
    collectionId: "north-carolina",
    label: "United States",
    naturalEarthId: "USA",
  },
];

type LocationReference = {
  id: string;
  collectionId: string;
  label: string;
  coordinates: [number, number];
  referenceLabel: string;
  photoSrcs: string[];
};

// Membership follows source asset identities; titles and photo order may change.
// Coordinate evidence and the limits of each reference are in map-hierarchy-spec.md.
const locations: LocationReference[] = [
  {
    id: "location:hallstatt",
    collectionId: "austria",
    label: "Hallstatt",
    coordinates: [13.65, 47.56],
    referenceLabel: "Hallstatt area reference",
    photoSrcs: ["/photos/hallstatt-1.webp", "/photos/hallstatt-2.webp"],
  },
  {
    id: "location:braies",
    collectionId: "italy",
    label: "Lago di Braies",
    coordinates: [12.08, 46.7],
    referenceLabel: "Lago di Braies area reference",
    photoSrcs: ["/photos/3_landscape_lago_di_braies.webp"],
  },
  {
    id: "location:seceda",
    collectionId: "italy",
    label: "Seceda",
    coordinates: [11.73, 46.6],
    referenceLabel: "Seceda ridge area reference",
    photoSrcs: ["/photos/landscape_dolomites_seceda.webp"],
  },
  {
    id: "location:santa-magdalena",
    collectionId: "italy",
    label: "Santa Magdalena",
    coordinates: [11.71, 46.64],
    referenceLabel: "Santa Magdalena village area reference",
    photoSrcs: ["/photos/landscape_dolomites_santa_magdalena.webp"],
  },
  {
    id: "location:cadini",
    collectionId: "italy",
    label: "Cadini di Misurina",
    coordinates: [12.29, 46.59],
    referenceLabel: "Cadini area reference near Fonda Savio",
    photoSrcs: ["/photos/landscape_dolomites_cadini_di_misurina.webp"],
  },
  {
    id: "location:tromso",
    collectionId: "norway",
    label: "Tromsø",
    coordinates: [18.96, 69.65],
    referenceLabel: "Tromsø regional reference",
    photoSrcs: ["/photos/landscape_sailboat_in_a_blizzard.webp"],
  },
  {
    id: "location:lofoten",
    collectionId: "norway",
    label: "Lofoten",
    coordinates: [13.38, 68.05],
    referenceLabel: "Lofoten regional reference",
    photoSrcs: [
      "/photos/4_lifestyle_product_aileen_wearing_helly_hansen_jacket_lofoten_islands_norway.webp",
      "/photos/lifestyle_portrait_emily_wearing_satila_beanie_lofoten_islands_norway.webp",
    ],
  },
  {
    id: "location:lake-james",
    collectionId: "north-carolina",
    label: "Lake James",
    coordinates: [-81.89, 35.75],
    referenceLabel: "Lake James area reference near Paddy’s Creek",
    photoSrcs: ["/photos/landscape_lake_james.webp"],
  },
  {
    id: "location:raleigh",
    collectionId: "north-carolina",
    label: "Raleigh",
    coordinates: [-78.68, 35.78],
    referenceLabel: "NC State campus area reference, Raleigh",
    photoSrcs: ["/photos/portrait_ncsu_grad_photo_4.webp"],
  },
];

function countryCoordinates(country: CountryReference): [number, number] {
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
  const country = countries.find((entry) => entry.id === countryId);
  if (!country) return null;
  const place = places.find((entry) => entry.id === country.collectionId);
  if (!place?.photos.length) return null;
  return getCoordinateBounds(
    locations
      .filter(
        (reference) =>
          reference.collectionId === country.collectionId &&
          place.photos.some((photo) => reference.photoSrcs.includes(photo.src)),
      )
      .map((reference) => reference.coordinates),
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
    const place = places.find((entry) => entry.id === country.collectionId);
    if (!place?.photos.length) return [];
    const base = { collectionId: place.id, countryId: country.id };
    if (kind === "country") {
      const bounds = getCountryChildBounds(country.id, places);
      const knownPhotoSrcs = new Set(
        locations
          .filter((reference) => reference.collectionId === place.id)
          .flatMap((reference) => reference.photoSrcs),
      );
      const hasUnknownLocations = place.photos.some(
        (photo) => !knownPhotoSrcs.has(photo.src),
      );
      return [
        {
          ...base,
          id: country.id,
          kind,
          label: country.label,
          coordinates: bounds
            ? boundsCenter(bounds)
            : countryCoordinates(country),
          photos: [...place.photos],
          photoCount: place.photos.length,
          cover: place.photos[0],
          precision: "country",
          referenceLabel: bounds
            ? `${country.label} photographed-region cluster reference${hasUnknownLocations ? " · unknown photo locations excluded" : ""}`
            : `${country.label} country reference · no verified photo locations`,
        } satisfies MapNode,
      ];
    }
    const references = locations.filter(
      (entry) => entry.collectionId === place.id,
    );
    const nodes = references.flatMap((reference): MapNode[] => {
      const photos = place.photos.filter((photo) =>
        reference.photoSrcs.includes(photo.src),
      );
      if (!photos.length) return [];
      return [
        {
          ...base,
          id: reference.id,
          kind,
          label: reference.label,
          coordinates: [...reference.coordinates],
          referenceLabel: reference.referenceLabel,
          photos,
          photoCount: photos.length,
          cover: photos[0],
          precision: "regional",
        },
      ];
    });
    const assigned = new Set(
      references.flatMap((reference) => reference.photoSrcs),
    );
    const unlocated = place.photos.filter((photo) => !assigned.has(photo.src));
    if (unlocated.length)
      nodes.push({
        ...base,
        id: `location:${place.id}-unlocated`,
        kind,
        label: `${country.label} · location unknown`,
        coordinates: countryCoordinates(country),
        referenceLabel: `${country.label} collection reference · photo location unknown`,
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
