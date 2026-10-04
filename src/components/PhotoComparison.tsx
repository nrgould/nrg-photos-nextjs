"use client";
import { useId, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";
import type { Photo } from "@/lib/photography";
import PhotoImage from "./PhotoImage";

export type ComparisonPair = {
  before: Photo;
  after: Photo;
  presetId: string;
  sourcePhotoId: string;
  provenance: "verified-export" | "same-image-demo";
};

export default function PhotoComparison({ pair }: { pair: ComparisonPair }) {
  const [position, setPosition] = useState(50);
  const hintId = useId();
  const demo = pair.provenance === "same-image-demo";
  return (
    <figure className="photo-comparison">
      <div className="comparison-stage">
        <PhotoImage
          photo={pair.after}
          sizes="(max-width: 700px) calc(100vw - 64px), 832px"
        />
        <div
          className="comparison-before"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <PhotoImage
            photo={pair.before}
            sizes="(max-width: 700px) calc(100vw - 64px), 832px"
          />
        </div>
        <span className="comparison-label before">
          {demo ? "Same image" : "Before"}
        </span>
        <span className="comparison-label after">
          {demo ? "Same image" : "After"}
        </span>
        <div
          className="comparison-divider"
          style={{ left: `${position}%` }}
          aria-hidden="true"
        >
          <span>
            <ChevronsLeftRight size={22} />
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          aria-label="Before and after split"
          aria-describedby={hintId}
          aria-valuetext={`${position}% ${demo ? "left image" : "before"}, ${100 - position}% ${demo ? "right image" : "after"}`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
      <figcaption id={hintId}>
        {demo
          ? "Interaction demo · the same photograph on both sides. No preset effect is shown."
          : "Matching exports of the same photograph, before and after this preset."}
        <span>
          Drag the line, or use arrow keys. Home / End reveal either side.
        </span>
      </figcaption>
    </figure>
  );
}
