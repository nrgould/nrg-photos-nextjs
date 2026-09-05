"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/lib/photography";
import PhotoImage from "./PhotoImage";
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const touchStart = useRef<number | null>(null);
  const move = useCallback(
    (direction: number) =>
      setActive((i) =>
        i === null ? null : (i + direction + photos.length) % photos.length,
      ),
    [photos.length],
  );
  const close = useCallback(() => {
    dialogRef.current?.close();
    setActive(null);
    returnFocus.current?.focus();
  }, []);
  useEffect(() => {
    if (active === null) return;
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [active]);
  const current = active === null ? null : photos[active];
  return (
    <>
      <div className="photo-grid">
        {photos.map((photo, i) => (
          <figure key={photo.src}>
            <button
              className="photo-button"
              aria-label={`View ${photo.title}`}
              onClick={(e) => {
                returnFocus.current = e.currentTarget;
                setActive(i);
              }}
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
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label="Photograph viewer"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            move(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            move(-1);
          }
        }}
      >
        {current && (
          <>
            <div className="lightbox-bar">
              <span aria-live="polite">
                {active! + 1} / {photos.length}
              </span>
              <button
                onClick={close}
                aria-label="Close photograph viewer"
                autoFocus
              >
                <X size={24} />
              </button>
            </div>
            <div
              className="lightbox-image"
              onTouchStart={(e) => {
                touchStart.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStart.current !== null) {
                  const distance =
                    e.changedTouches[0].clientX - touchStart.current;
                  if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
                  touchStart.current = null;
                }
              }}
            >
              <Image
                key={current.src}
                src={current.src}
                alt={current.alt}
                fill
                sizes="90vw"
                quality={85}
              />
            </div>
            <div className="lightbox-footer">
              <button onClick={() => move(-1)} aria-label="Previous photograph">
                <ChevronLeft />
              </button>
              <p aria-live="polite">
                {current.title}
                <span>© Nicholas Gould</span>
              </p>
              <button onClick={() => move(1)} aria-label="Next photograph">
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
