"use client";

import { useCallback, useMemo } from "react";
import { selectionFeedback } from "@/lib/haptics";
import {
  FAVORITES_STORAGE_KEY,
  restoreFavorites,
  toggleFavorite,
  type FavoriteKind,
} from "@/lib/favorites";
import { createStoredSnapshot } from "./storedSnapshot";

const favoritesStore = createStoredSnapshot(
  FAVORITES_STORAGE_KEY,
  JSON.stringify(restoreFavorites(null)),
);

export function useFavorites() {
  const snapshot = favoritesStore.use();
  const favorites = useMemo(() => restoreFavorites(snapshot), [snapshot]);
  const toggle = useCallback((kind: FavoriteKind, id: string) => {
    const next = toggleFavorite(
      restoreFavorites(favoritesStore.get()),
      kind,
      id,
    );
    if (favoritesStore.set(JSON.stringify(next))) selectionFeedback();
  }, []);
  return { favorites, toggle };
}
