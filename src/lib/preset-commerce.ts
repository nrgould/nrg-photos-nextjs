import presets from "../data/presets.json";

export type PresetCatalogItem = Readonly<{
  id: string;
  number: number;
  name: string;
  /** The preset's mood, e.g. "Alpine Blue". */
  category: string;
  /** Other moods it is also listed under. */
  also?: readonly string[];
  /** The map location it was made for. */
  location: string;
  bestFor: string;
  whatItDoes: string;
  watchOut?: string;
  /** Storage keys in the public preset-examples bucket; one shared size. */
  example?: Readonly<{
    before: string;
    after: string;
    width: number;
    height: number;
  }>;
  /** Hand-picked map photo srcs, in display order. */
  showcase: readonly string[];
}>;

// Written by scripts/import-presets.mjs from the preset library's public export.
export const presetCatalog: readonly PresetCatalogItem[] = Object.freeze(
  presets.map((preset) => Object.freeze(preset)),
);
export const presetCategories = [
  "All",
  ...new Set(presetCatalog.map((preset) => preset.category)),
];
export type PresetCategory = string;

function isCategory(value: unknown): value is PresetCategory {
  return presetCategories.some((category) => category === value);
}

export function getCatalogPreset(id: unknown) {
  return typeof id === "string"
    ? presetCatalog.find((preset) => preset.id === id)
    : undefined;
}

export type PresetCatalogState = {
  query: string;
  category: PresetCategory;
  selectedPresetId: string | null;
};

export function createPresetCatalogState(
  initial: Partial<PresetCatalogState> = {},
): PresetCatalogState {
  return {
    query: typeof initial.query === "string" ? initial.query : "",
    category: isCategory(initial.category) ? initial.category : "All",
    selectedPresetId: getCatalogPreset(initial.selectedPresetId)?.id ?? null,
  };
}

export function filterPresetCatalog({
  query,
  category,
}: Pick<PresetCatalogState, "query" | "category">) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return presetCatalog.filter((preset) => {
    const text = `${preset.name} ${preset.category}`.toLocaleLowerCase();
    return (
      (category === "All" ||
        preset.category === category ||
        preset.also?.includes(category)) &&
      terms.every((term) => text.includes(term))
    );
  });
}

export type PresetPurchaseStatus =
  { status: "unknown-preset" } | { status: "not-configured"; presetId: string };

// This reports UI availability. A future server checkout must validate its own catalog.
export function getPresetPurchaseStatus(
  presetId: unknown,
): PresetPurchaseStatus {
  const preset = getCatalogPreset(presetId);
  return preset
    ? { status: "not-configured", presetId: preset.id }
    : { status: "unknown-preset" };
}
