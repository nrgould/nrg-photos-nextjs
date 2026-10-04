import { shuffleIndex, type TravelPlace } from "./places";

export type PhotoOrientation = "any" | "horizontal" | "vertical";
export type MapFilters = {
  locationIds: string[];
  orientation: PhotoOrientation;
};

export function defaultMapFilters(places: TravelPlace[]): MapFilters {
  return { locationIds: places.map((place) => place.id), orientation: "any" };
}

export function filterPlaces(places: TravelPlace[], filters: MapFilters) {
  return places.flatMap((place) => {
    if (!filters.locationIds.includes(place.id)) return [];
    const photos = place.photos.filter((photo) =>
      filters.orientation === "any"
        ? true
        : filters.orientation === "horizontal"
          ? photo.width > photo.height
          : photo.height > photo.width,
    );
    if (!photos.length) return [];
    return [
      photos.length === place.photos.length ? place : { ...place, photos },
    ];
  });
}

export function activeFilterCount(places: TravelPlace[], filters: MapFilters) {
  return (
    Number(places.some((place) => !filters.locationIds.includes(place.id))) +
    Number(filters.orientation !== "any")
  );
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
