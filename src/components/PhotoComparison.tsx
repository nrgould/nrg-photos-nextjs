"use client";
import { useId, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";
import type { Photo } from "@/lib/photography";
import PhotoImage from "./PhotoImage";
import { Skeleton } from "./ui/skeleton";

/** Matching exports of one photograph, before and after a preset. Key it by pair so a new pair never shows the old one. */
export type ComparisonPair = { before: Photo; after: Photo };

export default function PhotoComparison({ pair }: { pair: ComparisonPair }) {
  const [position, setPosition] = useState(50);
  // Both exports load before the stage shows; until then it pulses.
  const [loaded, setLoaded] = useState(0);
  const onLoad = () => setLoaded((count) => count + 1);
  const hintId = useId();
  const sizes = "(max-width: 700px) calc(100vw - 32px), 400px";
  return (
    <figure className="photo-comparison">
      <div
        className="comparison-stage"
        // Dragging the split must not drag the drawer shut.
        data-vaul-no-drag
        aria-busy={loaded < 2}
        style={{ aspectRatio: `${pair.after.width} / ${pair.after.height}` }}
      >
        <PhotoImage photo={pair.after} sizes={sizes} onLoad={onLoad} />
        <div
          className="comparison-before"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <PhotoImage photo={pair.before} sizes={sizes} onLoad={onLoad} />
        </div>
        {loaded < 2 && <Skeleton className="comparison-skeleton" />}
        <span className="comparison-label before">Before</span>
        <span className="comparison-label after">After</span>
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
          aria-valuetext={`${position}% before, ${100 - position}% after`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </div>
      <figcaption id={hintId} className="sr-only">
        Arrow keys move the line. Home and End reveal either side.
      </figcaption>
    </figure>
  );
}
