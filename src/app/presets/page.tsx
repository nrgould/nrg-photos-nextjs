import PresetStore from "@/components/PresetStore";
import { contentMetadata } from "@/lib/seo-content";
import {
  createPresetCatalogState,
  type PresetCategory,
} from "@/lib/preset-commerce";

export const metadata = contentMetadata(
  "Preset catalog",
  "Browse the 21 presets in Nicholas Gould’s 2026 Signature Collection. Individual catalog price $1.99 USD; checkout is not available yet.",
  "/presets",
);

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialState = createPresetCatalogState({
    query: typeof params.query === "string" ? params.query.slice(0, 200) : "",
    category:
      typeof params.category === "string"
        ? (params.category as PresetCategory)
        : "All",
    selectedPresetId: typeof params.preset === "string" ? params.preset : null,
  });
  return (
    <main id="main">
      <h1 className="sr-only">Preset catalog</h1>
      <PresetStore
        initialState={initialState}
        initialView={params.view === "cart" ? "cart" : "catalog"}
      />
    </main>
  );
}
