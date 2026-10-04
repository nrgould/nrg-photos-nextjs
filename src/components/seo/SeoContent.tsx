import Link from "next/link";
import Image from "next/image";
import type { Photo } from "@/lib/photography";
import type { MapNode } from "@/lib/map-hierarchy";
import {
  breadcrumbData,
  locationPath,
  photoPath,
  presetPath,
  presetPriceLabel,
  seoLocations,
  seoPhotos,
  seoPresets,
  serializeJsonLd,
  type Breadcrumb,
} from "@/lib/seo-content";
import styles from "./SeoContent.module.css";

export function StructuredData({ data }: { data: unknown }) {
  return data ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  ) : null;
}

export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
        <ol>
          {items.map((item, index) => (
            <li key={item.path}>
              {index === items.length - 1 ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path}>{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <StructuredData data={breadcrumbData(items)} />
    </>
  );
}

/** Plain server-rendered anchors remain discoverable without map or drawer hydration. */
export function LocationLinks({
  locations = seoLocations,
}: {
  locations?: readonly MapNode[];
}) {
  return (
    <ul className={styles.links}>
      {locations.map((node) => (
        <li key={node.id}>
          <Link href={locationPath(node)}>{node.label}</Link>
          <span>
            {node.photoCount}{" "}
            {node.photoCount === 1 ? "photograph" : "photographs"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PhotographLinks({
  photos = seoPhotos,
}: {
  photos?: readonly Photo[];
}) {
  return (
    <ul className={styles.photos}>
      {photos.map((photo) => (
        <li key={photo.src}>
          <Link href={photoPath(photo)}>
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(max-width: 640px) 90vw, (max-width: 1000px) 44vw, 29vw"
            />
            <span>{photo.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function PresetLinks() {
  return (
    <ul className={styles.links}>
      {seoPresets.map((preset) => (
        <li key={preset.id}>
          <Link href={presetPath(preset)}>{preset.name}</Link>
          <span>
            {preset.category} · {presetPriceLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DiscoveryLinks() {
  return (
    <nav
      aria-label="Browse photography and presets"
      className={styles.discovery}
    >
      <Link href="/locations">Photographed locations</Link>
      <Link href="/photographs">All photographs</Link>
      <Link href="/presets">Preset catalog</Link>
    </nav>
  );
}
