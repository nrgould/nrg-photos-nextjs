import {
  Breadcrumbs,
  DiscoveryLinks,
  PhotographLinks,
} from "@/components/seo/SeoContent";
import { contentMetadata, seoPhotos } from "@/lib/seo-content";

export const generateMetadata = () =>
  contentMetadata(
    "Photographs",
    `${seoPhotos.length} original photographs by Nicholas Gould: landscapes, travel, nature, lifestyle and portraits.`,
    "/photographs",
  );
export default function PhotographsPage() {
  return (
    <main id="main" className="page-width collection-page">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Photographs", path: "/photographs" },
        ]}
      />
      <div className="page-heading">
        <h1>Photographs</h1>
        <p>Landscapes, people and everyday stories by Nicholas Gould.</p>
      </div>
      <PhotographLinks />
      <DiscoveryLinks />
    </main>
  );
}
