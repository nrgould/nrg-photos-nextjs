import { notFound } from "next/navigation";
import {
  Breadcrumbs,
  DiscoveryLinks,
  StructuredData,
} from "@/components/seo/SeoContent";
import { getCatalogPreset } from "@/lib/preset-commerce";
import {
  contentMetadata,
  presetDescription,
  presetPath,
  presetPriceLabel,
  productData,
} from "@/lib/seo-content";
import styles from "@/components/seo/SeoContent.module.css";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Props) {
  const preset = getCatalogPreset((await params).id);
  if (!preset) notFound();
  return contentMetadata(
    `${preset.name} preset`,
    presetDescription(preset),
    presetPath(preset),
  );
}
export default async function PresetPage({ params }: Props) {
  const preset = getCatalogPreset((await params).id);
  if (!preset) notFound();
  return (
    <main id="main" className={`page-width collection-page ${styles.detail}`}>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Presets", path: "/presets" },
          { name: preset.name, path: presetPath(preset) },
        ]}
      />
      <StructuredData data={productData(preset)} />
      <div className="page-heading">
        <h1>{preset.name}</h1>
        <p>
          Signature Collection · Preset {String(preset.number).padStart(2, "0")}
        </p>
      </div>
      <dl className={styles.facts}>
        <dt>Category</dt>
        <dd>{preset.category}</dd>
        <dt>Catalog price</dt>
        <dd>{presetPriceLabel}</dd>
        <dt>Purchase status</dt>
        <dd>Checkout is not available.</dd>
      </dl>
      <p>
        Verified before-and-after previews and photograph associations are not
        available for this preset yet.
      </p>
      <a
        className="back-link"
        href={`/presets?preset=${encodeURIComponent(preset.id)}`}
      >
        View {preset.name} in the catalog
      </a>
      <DiscoveryLinks />
    </main>
  );
}
