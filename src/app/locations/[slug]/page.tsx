import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  DiscoveryLinks,
  PhotographLinks,
  StructuredData,
} from "@/components/seo/SeoContent";
import {
  contentMetadata,
  getSeoLocation,
  locationData,
  locationDescription,
  locationPath,
} from "@/lib/seo-content";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const location = getSeoLocation((await params).slug);
  if (!location) notFound();
  return contentMetadata(
    `${location.label} photographs`,
    locationDescription(location),
    locationPath(location),
    location.cover,
  );
}
export default async function LocationPage({ params }: Props) {
  const location = getSeoLocation((await params).slug);
  if (!location) notFound();
  return (
    <main id="main" className="page-width collection-page">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Locations", path: "/locations" },
          { name: location.label, path: locationPath(location) },
        ]}
      />
      <StructuredData data={locationData(location)} />
      <div className="page-heading">
        <h1>{location.label}</h1>
        <p>{locationDescription(location)}</p>
      </div>
      <p>
        {location.referenceLabel}. This locates the photographed area; it is not
        a recorded camera position.
      </p>
      <a
        className="back-link"
        href={`/explore?location=${encodeURIComponent(location.id)}`}
      >
        Explore {location.label} on the map
      </a>
      <PhotographLinks photos={location.photos} />
      <DiscoveryLinks />
    </main>
  );
}
