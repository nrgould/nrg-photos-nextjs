"use client";
import { useRef, type RefObject } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/lib/photography";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
export default function Lightbox({
  photos,
  index,
  onIndexChange,
  finalFocus,
}: {
  finalFocus?: RefObject<HTMLElement | null>;
  photos: Photo[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const move = (direction: number) =>
    index !== null &&
    onIndexChange((index + direction + photos.length) % photos.length);
  const current = index === null ? null : photos[index];
  return (
    <Dialog
      open={index !== null}
      onOpenChange={(open) => !open && onIndexChange(null)}
    >
      <DialogContent
        className="lightbox"
        finalFocus={finalFocus}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") move(1);
          if (e.key === "ArrowLeft") move(-1);
        }}
      >
        {current && (
          <>
            <DialogTitle className="sr-only">Photograph viewer</DialogTitle>
            <div className="lightbox-bar">
              <span aria-live="polite">
                {index! + 1} / {photos.length}
              </span>
              <DialogClose
                render={<Button variant="icon" />}
                aria-label="Close photograph viewer"
              >
                <X size={24} strokeWidth={1.5} />
              </DialogClose>
            </div>
            <div
              className="lightbox-image"
              onTouchStart={(e) => {
                touchStart.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStart.current === null) return;
                const distance =
                  e.changedTouches[0].clientX - touchStart.current;
                if (Math.abs(distance) > 50) move(distance > 0 ? -1 : 1);
                touchStart.current = null;
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
              <Button
                variant="icon"
                onClick={() => move(-1)}
                aria-label="Previous photograph"
              >
                <ChevronLeft strokeWidth={1.5} />
              </Button>
              <p aria-live="polite">
                {current.title}
                <span>© Nicholas Gould</span>
              </p>
              <Button
                variant="icon"
                onClick={() => move(1)}
                aria-label="Next photograph"
              >
                <ChevronRight strokeWidth={1.5} />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
