import Link from "next/link";
import PhotoGallery from "@/components/PhotoGallery";
import { allPhotos, collections, getCollection } from "@/lib/photography";
export const metadata = {
  title: "Selected work",
  description:
    "Explore original landscape, nature, lifestyle and portrait photographs by Nicholas Gould.",
  alternates: { canonical: "/work" },
};
export default async function WorkPage({
  searchParams,
}: {
  searchParams: Promise<{ collection?: string }>;
}) {
  const params = await searchParams;
  const selected = params.collection
    ? getCollection(params.collection)
    : undefined;
  const photos = selected?.photos ?? allPhotos;
  return (
    <main id="main" className="page-width work-page">
      <div className="page-heading">
        <h1>
          The way I <em>see it.</em>
        </h1>
        <p>A collection of places, people, and things worth a second look.</p>
      </div>
      <nav className="collection-filters" aria-label="Filter photographs">
        <Link href="/work" aria-current={!selected ? "page" : undefined}>
          All work <span>{allPhotos.length}</span>
        </Link>
        {collections.map((c) => (
          <Link
            href={`/work?collection=${c.slug}`}
            key={c.slug}
            aria-current={selected?.slug === c.slug ? "page" : undefined}
          >
            {c.category}
            <span>{c.photos.length}</span>
          </Link>
        ))}
      </nav>
      <div className="gallery-info">
        <p>{selected ? selected.title : "Selected photographs"}</p>
        <span>{photos.length} photographs</span>
      </div>
      <PhotoGallery key={selected?.slug ?? "all"} photos={photos} />
    </main>
  );
}
