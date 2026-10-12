import Link from "next/link";
import PhotoComparison from "@/components/PhotoComparison";
import PresetPackBuy from "@/components/PresetPackBuy";
import { Breadcrumbs } from "@/components/seo/SeoContent";
import { locationPath } from "@/lib/places";
import { presetCatalog, presetExample } from "@/lib/preset-commerce";
import { contentMetadata } from "@/lib/seo-content";

const presets = presetCatalog.toSorted((a, b) => a.number - b.number);
const moods = Map.groupBy(presets, (preset) => preset.category);

export const metadata = contentMetadata(
  "Signature Collection",
  `All ${presets.length} of Nicholas Gould’s Lightroom presets in one purchase, with before and after examples.`,
  "/presets",
);

export default function PresetPackPage() {
  return (
    <main id="main" className="page-width pack-page">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Signature Collection", path: "/presets" },
        ]}
      />
      <header className="pack-hero">
        <h1>Signature Collection</h1>
        <p>
          {presets.length} Lightroom presets · {moods.size} moods
        </p>
        <PresetPackBuy />
      </header>
      <ul className="pack-examples">
        {presets.map((preset) => {
          const pair = presetExample(preset);
          return (
            pair && (
              <li key={preset.id}>
                <PhotoComparison pair={pair} />
                <h3>{preset.name}</h3>
                <p>
                  {preset.category} ·{" "}
                  {locationPath(preset.location).at(-1)!.name}
                </p>
              </li>
            )
          );
        })}
      </ul>
      <section className="pack-included" aria-labelledby="pack-included">
        <h2 id="pack-included">Included</h2>
        <dl>
          {[...moods].map(([mood, list]) => (
            <div key={mood}>
              <dt>
                {mood} <span>{list.length}</span>
              </dt>
              <dd>{list.map((preset) => preset.name).join(", ")}</dd>
            </div>
          ))}
        </dl>
        <ul>
          <li>Lightroom preset files (.xmp)</li>
          <li>Downloads from Your presets, any time</li>
          <li>
            Refunds within 14 days (<Link href="/terms#refunds">terms</Link>)
          </li>
        </ul>
        <PresetPackBuy />
      </section>
    </main>
  );
}
