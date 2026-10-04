"use client";
import { useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
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
  const reducedMotion = useReducedMotion();
  const touchStart = useRef<[number, number] | null>(null);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
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
                  src={current.src}
                  alt={current.alt}
                  width={current.width}
                  height={current.height}
                  sizes="90vw"
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
                <span>© Nicholas Gould</span>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
