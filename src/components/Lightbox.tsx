"use client";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import Image, { getImageProps } from "next/image";
import { preload } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
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
  const reducedMotion = useReducedMotion();
  const touchStart = useRef<[number, number] | null>(null);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const move = (direction: number) =>
    index !== null &&
    onIndexChange((index + direction + photos.length) % photos.length);
  const current = index === null ? null : photos[index];
  // Keep the current photo centred in the filmstrip; the dialog mounts after effects run.
  const centre = (button: HTMLButtonElement | null) =>
    button?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: reducedMotion ? "instant" : "smooth",
    });
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
            setKeyboardNavigation(true);
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
              onTouchStart={(e) => {
                setKeyboardNavigation(false);
                touchStart.current =
                  e.touches.length === 1
                    ? [e.touches[0].clientX, e.touches[0].clientY]
                    : null;
              }}
              onTouchCancel={() => {
                touchStart.current = null;
              }}
              onTouchEnd={(e) => {
                if (touchStart.current === null) return;
                const distance =
                  e.changedTouches[0].clientX - touchStart.current[0];
                const vertical =
                  e.changedTouches[0].clientY - touchStart.current[1];
                if (
                  Math.abs(distance) > 50 &&
                  Math.abs(distance) > Math.abs(vertical)
                )
                  move(distance > 0 ? -1 : 1);
                touchStart.current = null;
              }}
            >
              <motion.div
                key={current.src}
                className="lightbox-photo"
                initial={
                  reducedMotion || keyboardNavigation
                    ? false
                    : { opacity: 0, transform: "scale(0.985)" }
                }
                animate={{ opacity: 1, transform: "scale(1)" }}
                transition={{
                  transform: { type: "spring", duration: 0.28, bounce: 0.14 },
                  opacity: { duration: 0.14 },
                }}
              >
                <Image
                  src={photoUrl(current.src)}
                  alt={current.alt}
                  width={current.width}
                  height={current.height}
                  sizes={sizes(current)}
                  quality={85}
                />
              </motion.div>
            </div>
            <div className="lightbox-footer">
              <Button
                variant="icon"
                onClick={(event) => {
                  setKeyboardNavigation(event.detail === 0);
                  move(-1);
                }}
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
                onClick={(event) => {
                  setKeyboardNavigation(event.detail === 0);
                  move(1);
                }}
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
                  onClick={() => {
                    setKeyboardNavigation(true);
                    onIndexChange(i);
                  }}
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
