import signatureCollection from "./signature-collection.json";

export const presetCategories = [
  "All",
  "Landscape & travel",
  "Nature",
  "Film",
  "Portrait",
] as const;
export type PresetCategory = (typeof presetCategories)[number];
export type PresetCatalogItem = Readonly<{
  id: string;
  number: number;
  name: string;
  category: Exclude<PresetCategory, "All">;
}>;

function isCategory(value: unknown): value is PresetCategory {
  return presetCategories.some((category) => category === value);
}

export const presetCatalog: readonly PresetCatalogItem[] = Object.freeze(
  signatureCollection.map(({ id, number, name, category }) => {
    if (!isCategory(category) || category === "All")
      throw new Error(`Invalid public preset category: ${category}`);
    return Object.freeze({ id, number, name, category });
  }),
);

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
      (category === "All" || preset.category === category) &&
      terms.every((term) => text.includes(term))
    );
  });
}

export type VerifiedPresetLocation = Readonly<{
  presetId: string;
  /** A map node id (e.g. "location:hallstatt"); tapping the preset flies there. */
  locationId: string;
  locationName: string;
  photoIds: readonly string[];
  provenance: "verified-edit-record";
}>;

// Populate only from approved edit provenance; sample recipes are not evidence.
const verifiedPresetLocations: readonly VerifiedPresetLocation[] = [];
export function getVerifiedPresetLocations(presetId: unknown) {
  if (!getCatalogPreset(presetId)) return [];
  return verifiedPresetLocations.filter((link) => link.presetId === presetId);
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
