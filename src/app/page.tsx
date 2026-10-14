import PlacesExplorer from "@/components/PlacesExplorer";
import { curating } from "@/lib/server/curate";
import { readExplorerParams } from "@/lib/explorer-url";
export const metadata = { alternates: { canonical: "/" } };
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { initialLocationId, initialPhoto, initialView, initialCatalogState } =
    readExplorerParams(await searchParams);
  return (
    <main id="main" className="explorer">
      <PlacesExplorer
        key={JSON.stringify({
          initialLocationId,
          initialCatalogState,
          initialView,
          initialPhoto,
        })}
        initialLocationId={initialLocationId}
        initialCatalogState={initialCatalogState}
        initialView={initialView}
        initialPhoto={initialPhoto}
        curating={curating()}
        contactEmailEnabled={Boolean(
          process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL,
        )}
      />
    </main>
  );
}
