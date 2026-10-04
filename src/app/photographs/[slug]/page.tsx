import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  DiscoveryLinks,
  StructuredData,
} from "@/components/seo/SeoContent";
import {
  contentMetadata,
  getPhotoCollection,
  getPhotoLocation,
  getSeoPhoto,
  imageData,
  locationPath,
  photoDescription,
  photoPath,
} from "@/lib/seo-content";
import styles from "@/components/seo/SeoContent.module.css";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const photo = getSeoPhoto((await params).slug);
  if (!photo) notFound();
  return contentMetadata(
    photo.title,
    photoDescription(photo),
    photoPath(photo),
    photo,
  );
}
export default async function PhotographPage({ params }: Props) {
  const photo = getSeoPhoto((await params).slug);
  if (!photo) notFound();
  const location = getPhotoLocation(photo);
  const collection = getPhotoCollection(photo);
  return (
    <main id="main" className={`page-width collection-page ${styles.detail}`}>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Photographs", path: "/photographs" },
          { name: photo.title, path: photoPath(photo) },
        ]}
      />
      <StructuredData data={imageData(photo)} />
      <div className="page-heading">
        <h1>{photo.title}</h1>
        <p>Photography by Nicholas Gould</p>
      </div>
      <figure>
        <Image
          className={styles.detailImage}
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 800px) 90vw, 80vw"
          preload
        />
        <figcaption className={styles.caption}>{photo.alt}</figcaption>
      </figure>
      <p>
        From <Link href={`/work/${collection.slug}`}>{collection.title}</Link>.
      </p>
      {location && (
        <p>
          Photographed area:{" "}
          <Link href={locationPath(location)}>{location.label}</Link>.{" "}
          {location.referenceLabel}; no camera GPS is recorded.
        </p>
      )}
      <DiscoveryLinks />
    </main>
  );
}
