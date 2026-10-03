"use client";
import { Button, buttonVariants } from "@/components/ui/button";
import { useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { TravelPlace } from "@/lib/places";
import PhotoImage from "./PhotoImage";

const angles = [-5, 7, -9, 4];

export default function PhotoStack({ place }: { place: TravelPlace }) {
  const [active, setActive] = useState(0);
  const stackRef = useRef<HTMLDivElement>(null);
  const photo = place.photos[active];
  const advance = () =>
    setActive((current) => (current + 1) % place.photos.length);
  return (
    <div className="place-stack">
      <div
        ref={stackRef}
        className="photo-stack"
        role="group"
        aria-label={`${place.name} photographs`}
      >
        {place.photos.map((item, i) => {
          const depth =
            (i - active + place.photos.length) % place.photos.length;
          if (depth > 3) return null;
          return (
            <button
              key={item.src}
              className={`polaroid${depth === 0 ? " is-front" : ""}${item.height > item.width ? " is-portrait" : ""}`}
              style={
                {
                  "--tilt": `${depth === 0 ? -3 : angles[i % angles.length]}deg`,
                  "--shift": `${depth === 0 ? 0 : (i % 2 ? 1 : -1) * (12 + depth * 5)}px`,
                  zIndex: place.photos.length - depth,
                } as CSSProperties
              }
              tabIndex={depth === 0 ? 0 : -1}
              onClick={(event) => {
                if (depth === 0) advance();
                else setActive(i);
                if (event.detail === 0)
                  requestAnimationFrame(() => {
                    stackRef.current
                      ?.querySelector<HTMLButtonElement>(".is-front")
                      ?.focus({ preventScroll: true });
                  });
              }}
              aria-label={
                depth === 0
                  ? `Next photograph in ${place.name}`
                  : `Show ${item.title}`
              }
            >
              <PhotoImage photo={item} sizes="(max-width:700px) 75vw, 32vw" />
              <span className="polaroid-title">{item.title}</span>
            </button>
          );
        })}
      </div>
      <div className="stack-controls">
        <p aria-live="polite" aria-atomic="true">
          <span>{place.name}</span> · {active + 1} / {place.photos.length}
          <span className="sr-only">: {photo.title}</span>
        </p>
        <Button variant="link" onClick={advance} className="text-[11px]">
          Next photograph
        </Button>
        <Link
          className={buttonVariants({
            variant: "link",
            className: "text-[11px]",
          })}
          href={`/work/${photo.collection}#${photo.src.split("/").pop()?.replace(".webp", "")}`}
        >
          View in collection
        </Link>
      </div>
    </div>
  );
}
