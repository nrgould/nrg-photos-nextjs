import { travelPlaces } from "./places";

export type Preset = {
  id: string;
  name: string;
  note: string;
  placeIds: string[];
  photoSrc: string;
  adjustments: { label: string; value: string }[];
  provenance: "sample";
};
const sample = (
  id: string,
  name: string,
  note: string,
  placeIds: string[],
  adjustments: Preset["adjustments"],
): Preset => ({
  id,
  name,
  note,
  placeIds,
  adjustments,
  provenance: "sample",
  photoSrc: travelPlaces.find((p) => p.id === placeIds[0])!.photos[0].src,
});
export const presets: Preset[] = [
  sample(
    "alpine-soft",
    "Alpine soft",
    "Quiet greens. Open shadows. A softer afternoon.",
    ["austria", "italy"],
    [
      { label: "Highlights", value: "−28" },
      { label: "Shadows", value: "+18" },
      { label: "Green saturation", value: "−12" },
    ],
  ),
  sample(
    "lake-light",
    "Lake light",
    "Cool water and a little warmth in the light.",
    ["italy"],
    [
      { label: "Temperature", value: "+4" },
      { label: "Contrast", value: "−8" },
      { label: "Aqua saturation", value: "−10" },
    ],
  ),
  sample(
    "northern-air",
    "Northern air",
    "Clear blues, weathered tones, room to breathe.",
    ["norway"],
    [
      { label: "Highlights", value: "−35" },
      { label: "Blacks", value: "+9" },
      { label: "Blue saturation", value: "−16" },
    ],
  ),
  sample(
    "homeward",
    "Homeward",
    "Warm evenings and the greens close to home.",
    ["united-states"],
    [
      { label: "Temperature", value: "+8" },
      { label: "Shadows", value: "+12" },
      { label: "Grain", value: "18" },
    ],
  ),
];
export const curatedPacks = [
  {
    id: "alpine",
    name: "The Alpine set",
    note: "Austria & the Dolomites",
    presetIds: ["alpine-soft", "lake-light"],
  },
  {
    id: "north",
    name: "North & home",
    note: "Arctic air to Carolina evenings",
    presetIds: ["northern-air", "homeward"],
  },
  {
    id: "complete",
    name: "Every place",
    note: "All four sample recipes",
    presetIds: presets.map((p) => p.id),
  },
];
export type CollectionState = {
  places: string[];
  photos: string[];
  presets: string[];
};
export const emptyCollection: CollectionState = {
  places: [],
  photos: [],
  presets: [],
};
export function restoreCollection(raw: string | null): CollectionState {
  try {
    const value = JSON.parse(raw ?? "null");
    const valid = (key: keyof CollectionState, ids: string[]) =>
      Array.isArray(value?.[key])
        ? [
            ...new Set<string>(
              value[key].filter(
                (id: unknown) => typeof id === "string" && ids.includes(id),
              ),
            ),
          ]
        : [];
    return {
      places: valid(
        "places",
        travelPlaces.map((p) => p.id),
      ),
      photos: valid(
        "photos",
        travelPlaces.flatMap((p) => p.photos.map((photo) => photo.src)),
      ),
      presets: valid(
        "presets",
        presets.map((p) => p.id),
      ),
    };
  } catch {
    return { ...emptyCollection };
  }
}
export function toggleId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
export function addPack(ids: string[], pack: string[]) {
  return [...new Set([...ids, ...pack])];
}
export function packManifest(ids: string[]) {
  return {
    version: 1,
    kind: "sample-preset-selection",
    purchasable: false,
    note: "Prototype recipes. Not Nicholas's verified editing history or downloadable Lightroom presets.",
    presets: presets.filter((p) => ids.includes(p.id)),
  };
}
