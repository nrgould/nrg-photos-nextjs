import {
  Breadcrumbs,
  DiscoveryLinks,
  LocationLinks,
} from "@/components/seo/SeoContent";
import { contentMetadata, seoLocations } from "@/lib/seo-content";

export const generateMetadata = () =>
  contentMetadata(
    "Photographed locations",
    `Explore ${seoLocations.length} photographed locations in Nicholas Gould’s portfolio, from Hallstatt and the Dolomites to northern Norway and North Carolina.`,
    "/locations",
  );
export default function LocationsPage() {
  return (
    <main id="main" className="page-width collection-page">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
        ]}
      />
      <div className="page-heading">
        <h1>Photographed locations</h1>
        <p>
          Places represented in Nicholas Gould’s photography. Map pins are
          regional references, not recorded camera GPS.
        </p>
      </div>
      <LocationLinks />
      <DiscoveryLinks />
    </main>
  );
}
