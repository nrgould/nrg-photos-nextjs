import { getMapNodes } from "./map-hierarchy";
import { travelPlaces } from "./places";

export const FAVORITES_STORAGE_KEY = "photography-favorites-v1";

export type Favorites = { placeIds: string[]; photoSrcs: string[] };
export type FavoriteKind = keyof Favorites;

const placeNodes = [
  ...getMapNodes(travelPlaces, "country"),
  ...getMapNodes(travelPlaces, "location"),
];
const known: Record<FavoriteKind, string[]> = {
  placeIds: placeNodes.map((node) => node.id),
  photoSrcs: travelPlaces.flatMap((place) => place.photos.map((p) => p.src)),
};

function knownIds(value: unknown, kind: FavoriteKind) {
  const ids = Array.isArray(value) ? value : [];
  return [...new Set(ids)].filter(
    (id): id is string => typeof id === "string" && known[kind].includes(id),
  );
}

/** Newest first; unknown or duplicate ids from old builds are dropped. */
export function restoreFavorites(raw: string | null): Favorites {
  try {
    const parsed = JSON.parse(raw ?? "null") ?? {};
    return {
      placeIds: knownIds(parsed.placeIds, "placeIds"),
      photoSrcs: knownIds(parsed.photoSrcs, "photoSrcs"),
    };
  } catch {
    return { placeIds: [], photoSrcs: [] };
  }
}

export function toggleFavorite(
  favorites: Favorites,
  kind: FavoriteKind,
  id: string,
): Favorites {
  if (!known[kind].includes(id)) return favorites;
  const list = favorites[kind];
  return {
    ...favorites,
    [kind]: list.includes(id)
      ? list.filter((entry) => entry !== id)
      : [id, ...list],
  };
}

/** The leaf a saved photo opens in. Every photo has one, including unlocated ones. */
export function nodeForPhoto(src: string) {
  return getMapNodes(travelPlaces, "location").find((node) =>
    node.photos.some((photo) => photo.src === src),
  );
}

export function placeNode(id: string) {
  return placeNodes.find((node) => node.id === id);
}
