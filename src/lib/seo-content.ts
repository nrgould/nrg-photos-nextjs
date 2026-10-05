import type { Metadata, MetadataRoute } from "next";
import { allPhotos, collections, type Photo } from "@/lib/photography";
import { getMapNodes, type MapNode } from "@/lib/map-hierarchy";
import { travelPlaces } from "@/lib/places";
import { presetCatalog, type PresetCatalogItem } from "@/lib/preset-commerce";
import { UNIT_PRICE_CENTS } from "@/lib/preset-cart";
import {
  getSeoConfig,
  seoRobotsMetadata,
  seoUrl,
  type SeoConfig,
} from "./seo-config";

export const seoLocations = getMapNodes(travelPlaces, "location").filter(
  (node) => node.precision === "regional",
);
export const seoPhotos = allPhotos;
export const seoPresets = presetCatalog;
export const presetPriceLabel = `$${(UNIT_PRICE_CENTS / 100).toFixed(2)} USD`;
export const locationSlug = (node: MapNode) =>
  node.id.replace(/^location:/, "");
// Source-derived identity survives editorial title changes. Preserve these public filenames.
export const photoSlug = (photo: Photo) =>
  photo.src.replace(/^\/photos\//, "").replace(/\.webp$/, "");
export const locationPath = (node: MapNode) =>
  `/locations/${encodeURIComponent(locationSlug(node))}`;
export const photoPath = (photo: Photo) =>
  `/photographs/${encodeURIComponent(photoSlug(photo))}`;
export const presetPath = (preset: PresetCatalogItem) =>
  `/presets/${encodeURIComponent(preset.id)}`;
export const getSeoLocation = (slug: string) =>
  seoLocations.find((node) => locationSlug(node) === slug);
export const getSeoPhoto = (slug: string) =>
  seoPhotos.find((photo) => photoSlug(photo) === slug);
export const getPhotoLocation = (photo: Photo) =>
  seoLocations.find((node) =>
    node.photos.some((item) => item.src === photo.src),
  );
export const getPhotoCollection = (photo: Photo) =>
  collections.find((collection) => collection.slug === photo.collection)!;
export const locationDescription = (node: MapNode) =>
  `${node.photoCount} ${node.photoCount === 1 ? "photograph" : "photographs"} from ${node.label} by Nicholas Gould, including ${[...new Set(node.photos.map((photo) => photo.title))].slice(0, 3).join(", ")}.`;
export const photoDescription = (photo: Photo) =>
  `${photo.alt}. Photograph by Nicholas Gould from ${getPhotoCollection(photo).title}.`;
export const presetDescription = (preset: PresetCatalogItem) =>
  `${preset.name}, preset ${String(preset.number).padStart(2, "0")} in Nicholas Gould’s Signature Collection. ${preset.category}. Catalog price ${presetPriceLabel}; checkout is not available.`;

export function contentMetadata(
  title: string,
  description: string,
  path: string,
  photo?: Photo,
  config: SeoConfig = getSeoConfig(),
): Metadata {
  const url = seoUrl(path, config);
  const image = photo && seoUrl(photo.src, config);
  return {
    title,
    description,
    robots: seoRobotsMetadata(config),
    // Explicit null prevents inheriting the legacy root canonical on these new routes.
    alternates: { canonical: config.indexable ? url : null },
    openGraph: {
      type: "website",
      title: `${title} | Nicholas Gould`,
      description,
      ...(url ? { url } : {}),
      images:
        image && photo
          ? [
              {
                url: image,
                width: photo.width,
                height: photo.height,
                alt: photo.alt,
              },
            ]
          : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: `${title} | Nicholas Gould`,
      description,
      images: image ? [image] : [],
    },
  };
}

export type Breadcrumb = { name: string; path: string };
export function breadcrumbData(items: Breadcrumb[], config = getSeoConfig()) {
  if (!config.origin) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: seoUrl(item.path, config),
    })),
  };
}
export function imageData(photo: Photo, config = getSeoConfig()) {
  if (!config.origin) return null;
  const location = getPhotoLocation(photo);
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${seoUrl(photoPath(photo), config)}#image`,
    url: seoUrl(photoPath(photo), config),
    contentUrl: seoUrl(photo.src, config),
    name: photo.title,
    description: photo.alt,
    caption: photo.alt,
    width: photo.width,
    height: photo.height,
    encodingFormat: "image/webp",
    creator: { "@type": "Person", name: "Nicholas Gould" },
    ...(location
      ? { contentLocation: { "@type": "Place", name: location.label } }
      : {}),
  };
}
export function locationData(node: MapNode, config = getSeoConfig()) {
  if (!config.origin) return null;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    url: seoUrl(locationPath(node), config),
    name: `${node.label} photographs`,
    description: locationDescription(node),
    about: {
      "@type": "Place",
      name: node.label,
      description: node.referenceLabel,
    },
    hasPart: node.photos.map((photo) => imageData(photo, config)),
  };
}
export function productData(
  preset: PresetCatalogItem,
  config = getSeoConfig(),
) {
  if (!config.origin) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${seoUrl(presetPath(preset), config)}#product`,
    url: seoUrl(presetPath(preset), config),
    name: preset.name,
    sku: preset.id,
    category: preset.category,
    description: presetDescription(preset),
    brand: { "@type": "Brand", name: "Nicholas Gould" },
    // A catalog fact, not an Offer: checkout and fulfillment are not configured.
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Catalog price (USD)",
        value: (UNIT_PRICE_CENTS / 100).toFixed(2),
      },
    ],
  };
}
export const serializeJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

/** Merge only after launch; no invented lastModified timestamps. */
export function seoSitemapEntries(
  config = getSeoConfig(),
): MetadataRoute.Sitemap {
  if (!config.indexable || !config.origin) return [];
  const paths = [
    "/locations",
    "/photographs",
    ...seoLocations.map(locationPath),
    ...seoPhotos.map(photoPath),
    ...seoPresets.map(presetPath),
  ];
  const imagesByPath = new Map(
    seoPhotos.map((photo) => [photoPath(photo), seoUrl(photo.src, config)!]),
  );
  return paths.map((path) => ({
    url: seoUrl(path, config)!,
    ...(imagesByPath.has(path) ? { images: [imagesByPath.get(path)!] } : {}),
  }));
}
