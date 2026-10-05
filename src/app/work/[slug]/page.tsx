import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collections, getCollection } from "@/lib/photography";
import PhotoGallery from "@/components/PhotoGallery";
import { Arrow } from "@/components/Arrow";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Collection not found" };
  return {
    title: collection.title,
    description: collection.description,
    alternates: { canonical: `/work/${slug}` },
    openGraph: {
      title: `${collection.title} | Nicholas Gould`,
      description: collection.description,
      images: [collection.cover.src],
    },
  };
}
export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();
  const next =
    collections[(collections.indexOf(collection) + 1) % collections.length];
  return (
    <main id="main" className="page-width collection-page">
      <Link className="back-link" href="/work">
        <Arrow className="reverse" /> All work
      </Link>
      <div className="page-heading">
        <h1>{collection.title}</h1>
        <p>{collection.description}</p>
      </div>
      <div className="gallery-info">
        <span>{collection.category}</span>
        <span>{collection.photos.length} photographs</span>
      </div>
      <PhotoGallery photos={collection.photos} />
      <Link href={`/work/${next.slug}`} className="next-collection">
        <span>Next collection</span>
        <h2>
          {next.title} <Arrow />
        </h2>
      </Link>
    </main>
  );
}
