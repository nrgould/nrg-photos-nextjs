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
  "/photos/lr-7029050.webp": "places",
  "/photos/lr-7029023.webp": "places",
  "/photos/3_landscape_lago_di_braies.webp": "places",
  "/photos/lr-4433864.webp": "places",
  "/photos/landscape_dolomites_santa_magdalena.webp": "places",
  "/photos/lr-4475385.webp": "places",
  "/photos/lr-4337389.webp": "places",
  "/photos/lr-3472824.webp": "places",
  "/photos/4_lifestyle_product_aileen_wearing_helly_hansen_jacket_lofoten_islands_norway.webp":
    "people",
  "/photos/lifestyle_portrait_emily_wearing_satila_beanie_lofoten_islands_norway.webp":
    "people",
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

export function navigatePlaces(
  places: TravelPlace[],
  selected: string | null,
  direction: "back" | "next" | "shuffle",
  random = Math.random(),
) {
  if (!places.length) return null;
  const current = places.findIndex((place) => place.id === selected);
  const index =
    direction === "shuffle"
      ? current < 0
        ? Math.floor(Math.min(Math.max(random, 0), 0.999999) * places.length)
        : shuffleIndex(current, places.length, random)
      : current < 0
        ? direction === "back"
          ? places.length - 1
          : 0
        : (current + (direction === "back" ? -1 : 1) + places.length) %
          places.length;
  return places[index].id;
}
