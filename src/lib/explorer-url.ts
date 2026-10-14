import { getMapNode } from "./map-hierarchy";
import { travelPlaces } from "./places";
import {
  createPresetCatalogState,
  type PresetCategory,
} from "./preset-commerce";

// The explorer mirrors its place, drawer page and open photo into the URL, so a reload lands where it was.
export const explorerViews = [
  "catalog",
  "cart",
  "contact",
  "library",
  "saved",
  "challenges",
  "menu",
] as const;
export type ExplorerView = (typeof explorerViews)[number];

export function readExplorerParams(
  params: Record<string, string | string[] | undefined>,
) {
  const text = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };
  const node = getMapNode(text("location") ?? null, travelPlaces);
  const photo = text("photo");
  return {
    initialLocationId: node?.id,
    initialPhoto: node?.photos.some(({ src }) => src === photo)
      ? photo
      : undefined,
    initialView: explorerViews.find((view) => view === text("view")),
    initialCatalogState: createPresetCatalogState({
      query: text("query")?.slice(0, 200) ?? "",
      category: text("category") as PresetCategory,
      selectedPresetId: text("preset") ?? null,
    }),
  };
}

/** `page` is the drawer page on top: "presets" and "preset" are the catalog's list and detail. */
export function writeExplorerParams({
  location,
  page,
  presetId,
  category,
  photo,
}: {
  location: string | null;
  page: string | null;
  presetId: string | null;
  category: string;
  photo: string | null;
}) {
  const params = new URLSearchParams();
  if (location) params.set("location", location);
  if (page === "presets" || page === "preset") {
    params.set("view", "catalog");
    if (category !== "All") params.set("category", category);
    if (page === "preset" && presetId) params.set("preset", presetId);
  } else if (explorerViews.some((view) => view === page))
    params.set("view", page as ExplorerView);
  if (location && photo) params.set("photo", photo);
  return params;
}
