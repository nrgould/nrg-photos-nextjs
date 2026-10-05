import { getMapNodes, type MapNode } from "./map-hierarchy";
import type { Photo } from "./photography";
import { shuffleIndex, type TravelPlace } from "./places";

export type PhotoOrientation = "any" | "horizontal" | "vertical";
export type PhotoSubject = "all" | "places" | "people";
export type MapFilters = {
  locationIds: string[];
  orientation: PhotoOrientation;
  subject?: PhotoSubject;
};

export function defaultMapFilters(places: TravelPlace[]): MapFilters {
  return {
    locationIds: places.map((place) => place.id),
    orientation: "any",
    subject: "all",
  };
}

// Editorial subjects for the original map photographs, grounded in their titles
// and alt text. Portfolio copies of a Lightroom photo are keyed by the Lightroom
// src. New sources stay unclassified until explicitly reviewed.
const photoSubjects: Readonly<Record<string, Exclude<PhotoSubject, "all">>> = {
  "/photos/lr-7029023.webp": "places",
  "/photos/3_landscape_lago_di_braies.webp": "places",
  "/photos/lr-4433864.webp": "places",
  "/photos/landscape_dolomites_santa_magdalena.webp": "places",
  "/photos/lr-4475385.webp": "places",
  "/photos/lr-4337389.webp": "places",
  "/photos/lr-3472824.webp": "places",
};

export function getPhotoSubject(src: string) {
  return photoSubjects[src];
}

export function filterPlaces(places: TravelPlace[], filters: MapFilters) {
  return places.flatMap((place) => {
    if (!filters.locationIds.includes(place.id)) return [];
    const photos = place.photos.filter((photo) => {
      const subjectMatches =
        !filters.subject ||
        filters.subject === "all" ||
        getPhotoSubject(photo.src) === filters.subject;
      const orientationMatches =
        filters.orientation === "any" ||
        (filters.orientation === "horizontal"
          ? photo.width > photo.height
          : photo.height > photo.width);
      return subjectMatches && orientationMatches;
    });
    if (!photos.length) return [];
    return [
      photos.length === place.photos.length ? place : { ...place, photos },
    ];
  });
}

export function activeFilterCount(places: TravelPlace[], filters: MapFilters) {
  return (
    Number(places.some((place) => !filters.locationIds.includes(place.id))) +
    Number(filters.orientation !== "any") +
    Number(Boolean(filters.subject && filters.subject !== "all"))
  );
}

/** Option counts respect the other facet, so they predict the next result set. */
export function mapFilterFacetCounts(
  places: TravelPlace[],
  filters: MapFilters,
) {
  const count = (next: MapFilters) =>
    filterPlaces(places, next).reduce(
      (total, place) => total + place.photos.length,
      0,
    );
  return {
    subject: {
      all: count({ ...filters, subject: "all" }),
      places: count({ ...filters, subject: "places" }),
      people: count({ ...filters, subject: "people" }),
    },
    orientation: {
      any: count({ ...filters, orientation: "any" }),
      horizontal: count({ ...filters, orientation: "horizontal" }),
      vertical: count({ ...filters, orientation: "vertical" }),
    },
  };
}

export function retainSelection(
  places: TravelPlace[],
  selected: string | null,
) {
  return places.some((place) => place.id === selected) ? selected : null;
}

export function shufflePlace(
  places: TravelPlace[],
  selected: string | null,
  random = Math.random(),
) {
  if (!places.length) return null;
  const current = places.findIndex((place) => place.id === selected);
  const index =
    current < 0
      ? Math.floor(Math.min(Math.max(random, 0), 0.999999) * places.length)
      : shuffleIndex(current, places.length, random);
  return places[index].id;
}

/** Great-circle angle between two [longitude, latitude] points, in radians. */
function arc([lon1, lat1]: [number, number], [lon2, lat2]: [number, number]) {
  const r = Math.PI / 180;
  const cos =
    Math.sin(lat1 * r) * Math.sin(lat2 * r) +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return Math.acos(Math.min(1, Math.max(-1, cos)));
}

/** Every location once, walking to the nearest one not yet visited from the westernmost. */
// ponytail: greedy nearest-neighbor, no 2-opt; fine for ~100 places, revisit if the walk crosses itself badly.
export function locationTour(places: TravelPlace[]) {
  const left = getMapNodes(places, "location").sort(
    (a, b) => a.coordinates[0] - b.coordinates[0],
  );
  const tour = left.splice(0, 1);
  while (left.length) {
    const from = tour.at(-1)!.coordinates;
    let nearest = 0;
    for (let i = 1; i < left.length; i++)
      if (arc(from, left[i].coordinates) < arc(from, left[nearest].coordinates))
        nearest = i;
    tour.push(...left.splice(nearest, 1));
  }
  return tour;
}

/**
 * Previous and Next: the neighboring location on the tour. From a country,
 * its first location on the tour; from nothing, either end.
 */
export function stepLocation(
  places: TravelPlace[],
  current: string | null,
  direction: "back" | "next",
): MapNode | null {
  const tour = locationTour(places);
  if (!tour.length) return null;
  const index = tour.findIndex((node) => node.id === current);
  if (index >= 0)
    return tour[
      (index + (direction === "back" ? -1 : 1) + tour.length) % tour.length
    ];
  return (
    tour.find(
      (node) => node.countryId === current || node.collectionId === current,
    ) ?? (direction === "back" ? tour.at(-1)! : tour[0])
  );
}

export type SearchHit<T> = T & { node: MapNode; collection: string };

// Accent-blind, so "tromso" finds Tromsø.
const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss");

/** Text search over places and photographs: every word must appear. */
export function searchExplorer(
  places: TravelPlace[],
  query: string,
  limit = 20,
) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const matches = (...text: string[]) => {
    const haystack = fold(text.join(" "));
    return words.every((word) => haystack.includes(word));
  };
  const collection = (node: MapNode) =>
    places.find((place) => place.id === node.collectionId)?.name ?? "";
  const locations = getMapNodes(places, "location");
  const placeHits = [...getMapNodes(places, "country"), ...locations]
    .map((node) => ({ node, collection: collection(node) }))
    .filter(({ node, collection }) => matches(node.label, collection));
  if (!words.length) return { places: placeHits, photos: [] };
  // Locations before countries, so a photo is listed under its own place.
  const seen = new Set<string>();
  const photos: SearchHit<{ photo: Photo }>[] = [];
  for (const node of [...locations, ...getMapNodes(places, "country")])
    for (const photo of node.photos) {
      if (seen.has(photo.src)) continue;
      seen.add(photo.src);
      const name = collection(node);
      if (matches(photo.title, photo.alt, node.label, name))
        photos.push({ photo, node, collection: name });
    }
  return { places: placeHits, photos: photos.slice(0, limit) };
}
