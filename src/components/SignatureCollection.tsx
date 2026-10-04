"use client";
import { useState } from "react";
import catalog from "@/lib/signature-collection.json";
import type { Photo } from "@/lib/photography";
import { Button } from "./ui/button";
import PhotoComparison, { type ComparisonPair } from "./PhotoComparison";

const verifiedPairs: ComparisonPair[] = [];
const categories = ["All", "Landscape & travel", "Nature", "Film", "Portrait"];

export default function SignatureCollection({ photo }: { photo: Photo }) {
  const [selected, setSelected] = useState(catalog[0]);
  const [category, setCategory] = useState("All");
  const [demo, setDemo] = useState(false);
  const pair = verifiedPairs.find((item) => item.presetId === selected.id);
  return (
    <section
      id="signature-collection"
      className="signature-collection"
      aria-labelledby="signature-title"
    >
      <div className="signature-heading">
        <div>
          <p className="eyebrow">The full collection · 21 Lightroom presets</p>
          <h2 id="signature-title">2026 Signature Collection</h2>
        </div>
      </div>
      <div className="signature-filters" aria-label="Preset categories">
        {categories.map((item) => (
          <Button
            key={item}
            variant="control"
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="signature-list" aria-label="Full preset list">
        {catalog
          .filter((item) => category === "All" || item.category === category)
          .map((item) => (
            <button
              key={item.id}
              aria-pressed={selected.id === item.id}
              onClick={() => {
                setSelected(item);
                setDemo(false);
              }}
            >
              <span>{String(item.number).padStart(2, "0")}</span>
              <strong>{item.name}</strong>
              <small>{item.category}</small>
            </button>
          ))}
      </div>
      <div className="signature-preview">
        <div className="signature-preview-heading">
          <div>
            <p className="eyebrow">Preset preview</p>
            <h3>{selected.name}</h3>
          </div>
          {!pair && (
            <Button
              variant="control"
              aria-pressed={demo}
              onClick={() => setDemo(!demo)}
            >
              {demo
                ? "Close interaction demo"
                : "Try the split-view interaction"}
            </Button>
          )}
        </div>
        {!pair && (
          <p className="sample-notice">
            Before / after exports are still to come. This preset has not been
            matched to a photograph. Preset files are not available for download
            here.
          </p>
        )}
        {(pair || demo) && (
          <PhotoComparison
            key={selected.id}
            pair={
              pair ?? {
                before: photo,
                after: photo,
                presetId: selected.id,
                sourcePhotoId: photo.src,
                provenance: "same-image-demo",
              }
            }
          />
        )}
      </div>
    </section>
  );
}
