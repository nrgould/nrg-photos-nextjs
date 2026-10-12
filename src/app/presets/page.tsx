import Link from "next/link";
import PhotoComparison from "@/components/PhotoComparison";
import PresetPackBuy from "@/components/PresetPackBuy";
import { Breadcrumbs } from "@/components/seo/SeoContent";
import { getLocationNode } from "@/lib/map-hierarchy";
import { locationPath, travelPlaces } from "@/lib/places";
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
          I made each of these presets while editing my own photographs from a
          trip, in places like Eibsee, Hallstatt, Lofoten, Mount Rainier and New
          York City. Under every preset is the place it came from, and the link
          opens my photographs from there on the map.
        </p>
        <PresetPackBuy />
      </header>
      <ul className="pack-examples">
        {presets.map((preset) => {
          const pair = presetExample(preset);
          const home = locationPath(preset.location).at(-1)!;
          const node = getLocationNode(travelPlaces, preset.location);
          return (
            pair && (
              <li key={preset.id}>
                <PhotoComparison pair={pair} />
                <h3>{preset.name}</h3>
                <p>
                  Made in{" "}
                  {node ? (
                    <Link href={`/?location=${encodeURIComponent(node.id)}`}>
                      {home.name}
                    </Link>
                  ) : (
                    home.name
                  )}
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
