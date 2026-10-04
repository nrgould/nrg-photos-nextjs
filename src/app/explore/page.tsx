import PlacesExplorer from "@/components/PlacesExplorer";
import { getMapNode } from "@/lib/map-hierarchy";
import { travelPlaces } from "@/lib/places";
import {
  createPresetCatalogState,
  type PresetCategory,
} from "@/lib/preset-commerce";
export const metadata = {
  title: "Photographs on the map",
  alternates: { canonical: "/explore" },
};
export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialLocationId =
    typeof params.location === "string" &&
    getMapNode(params.location, travelPlaces)
      ? params.location
      : undefined;
  const initialCatalogState = createPresetCatalogState({
    query: typeof params.query === "string" ? params.query.slice(0, 200) : "",
    category:
      typeof params.category === "string"
        ? (params.category as PresetCategory)
        : "All",
    selectedPresetId: typeof params.preset === "string" ? params.preset : null,
  });
  const initialView =
    params.view === "cart" || params.view === "catalog"
      ? params.view
      : undefined;
  return (
    <main id="main" className="explorer">
      <PlacesExplorer
        key={JSON.stringify({
          initialLocationId,
          initialCatalogState,
          initialView,
        })}
        initialLocationId={initialLocationId}
        initialCatalogState={initialCatalogState}
        initialView={initialView}
      />
    </main>
  );
}
