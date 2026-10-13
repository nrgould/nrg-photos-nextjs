"use client";
import { useRef, type ReactNode, type RefObject } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { photoUrl, takenLabel, type Photo } from "@/lib/photography";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
/** Rendered width: the image fits the stage between the bar, footer and filmstrip, so portraits are height-bound. */
function sizes(photo: Photo) {
  const fit = `calc((100vh - 200px) * ${(photo.width / photo.height).toFixed(3)})`;
  return `(max-width: 700px) min(calc(100vw - 24px), ${fit}), min(calc(100vw - 140px), ${fit})`;
}
export default function Lightbox({
  photos,
  index,
  onIndexChange,
  finalFocus,
  action,
}: {
  finalFocus?: RefObject<HTMLElement | null>;
  /** Extra control beside Close, for the photo on screen. */
  action?: (photo: Photo) => ReactNode;
  photos: Photo[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  // The track's scroll position is the source of truth: navigation scrolls it, and a settled scroll reports the index.
  const track = useRef<HTMLDivElement | null>(null);
  // Where a button or key last aimed, so presses during a slide keep counting.
  const aim = useRef<number | null>(null);
  const go = (i: number, slide: boolean) => {
    aim.current = i;
    track.current?.scrollTo({
      left: i * track.current.clientWidth,
      behavior: slide ? "auto" : "instant",
    });
  };
  const move = (direction: number) => {
    if (index === null) return;
    const next = (aim.current ?? index) + direction;
    const wrapped = (next + photos.length) % photos.length;
    go(wrapped, wrapped === next);
  };
  const current = index === null ? null : photos[index];
  // Keep the current photo centred in the filmstrip; the dialog mounts after effects run.
  const centre = (button: HTMLButtonElement | null) =>
    button?.scrollIntoView({ inline: "center", block: "nearest" });
  if (index !== null)
    for (const offset of [1, -1]) {
      const photo = photos[(index + offset + photos.length) % photos.length];
      const { props } = getImageProps({
        src: photoUrl(photo.src),
        alt: photo.alt,
        width: photo.width,
        height: photo.height,
        sizes: sizes(photo),
        quality: 85,
      });
      preload(props.src, {
        as: "image",
        imageSrcSet: props.srcSet,
        imageSizes: props.sizes,
        fetchPriority: "low",
      });
    }
  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => !open && onIndexChange(null)}
    >
      <DialogContent
        className="lightbox data-starting-style:scale-100"
        finalFocus={finalFocus}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {current && (
          <>
            <DialogTitle className="sr-only">Photograph viewer</DialogTitle>
            <div className="lightbox-bar">
              <span aria-live="polite">
                {index! + 1} / {photos.length}
              </span>
              <span className="lightbox-actions">
                {action?.(current)}
                <DialogClose
                  render={<Button variant="icon" />}
                  aria-label="Close photograph viewer"
                >
                  <X size={24} strokeWidth={1.5} />
                </DialogClose>
              </span>
            </div>
            <div
              className="lightbox-image"
              ref={(el) => {
                // Open on the chosen photo without sliding from the first.
                if (el && el !== track.current) {
                  el.scrollTo({
                    left: index! * el.clientWidth,
                    behavior: "instant",
                  });
                  track.current = el;
                  aim.current = null;
                }
              }}
              onScroll={(e) => {
                const { scrollLeft, clientWidth } = e.currentTarget;
                const i = Math.round(scrollLeft / clientWidth);
                // Report only once settled, so a drag across the midpoint opens nothing.
                if (Math.abs(scrollLeft - i * clientWidth) >= 1) return;
                // Still at the start of a slide a button or key began.
                if (i === index && aim.current !== null && aim.current !== i)
                  return;
                aim.current = null;
                if (i !== index) onIndexChange(i);
              }}
            >
              {photos.map((photo, i) => (
                <div
                  key={photo.src}
                  className="lightbox-photo"
                  aria-hidden={i !== index || undefined}
                >
                  <Image
                    src={photoUrl(photo.src)}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes={sizes(photo)}
                    quality={85}
                  />
                </div>
              ))}
            </div>
            <div className="lightbox-footer">
              <Button
                variant="icon"
                onClick={() => move(-1)}
                aria-label="Previous photograph"
              >
                <ChevronLeft strokeWidth={1.5} />
              </Button>
              <p aria-live="polite">
                {current.title}
                <span>
                  {current.taken && `${takenLabel(current.taken)} · `}© Nicholas
                  Gould
                </span>
              </p>
              <Button
                variant="icon"
                onClick={() => move(1)}
                aria-label="Next photograph"
              >
                <ChevronRight strokeWidth={1.5} />
              </Button>
            </div>
            <div className="lightbox-strip">
              {photos.map((photo, i) => (
                <button
                  key={photo.src}
                  type="button"
                  aria-label={`Photograph ${i + 1}`}
                  ref={i === index ? centre : undefined}
                  aria-current={i === index || undefined}
                  onClick={() => go(i, Math.abs(i - index!) === 1)}
                >
                  <Image
                    src={photoUrl(photo.src, true)}
                    alt=""
                    width={photo.width}
                    height={photo.height}
                    sizes="48px"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
