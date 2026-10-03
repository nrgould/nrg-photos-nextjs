"use client";
import { useState } from "react";
import type { Photo } from "@/lib/photography";
import PhotoImage from "./PhotoImage";
import Lightbox from "./Lightbox";
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <figure
            key={photo.src}
            id={photo.src.split("/").pop()?.replace(".webp", "")}
          >
            <button
              className="photo-button"
              aria-label={`View ${photo.title}`}
              onClick={() => setActive(i)}
            >
              <PhotoImage
                photo={photo}
                sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
              />
              <span className="photo-expand" aria-hidden="true">
                View photograph
              </span>
            </button>
            <figcaption>{photo.title}</figcaption>
          </figure>
        ))}
      </div>
      <Lightbox photos={photos} index={active} onIndexChange={setActive} />
    </>
  );
}
