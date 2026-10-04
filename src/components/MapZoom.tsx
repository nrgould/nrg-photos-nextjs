"use client";
import { useEffect, useRef, useState } from "react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Globe2, Map as MapIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "./ui/popover";

import {
  zoomLevels,
  zoomLabels,
  zoomStop,
  zoomStopPosition,
} from "@/lib/map-zoom-stops";
import { selectionFeedback } from "@/lib/haptics";

export default function MapZoom({
  mode,
  zoom,
  onChange,
  vertical = false,
}: {
  mode: "globe" | "map";
  zoom: number;
  onChange: (mode: "globe" | "map", zoom: number) => void;
  /** Desktop shows a standalone vertical rail instead of a popover. */
  vertical?: boolean;
}) {
  const value = zoomStop(mode, zoom);
  const [draft, setDraft] = useState<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [keyboardInteraction, setKeyboardInteraction] = useState(false);
  const reduced = useReducedMotion();
  const current = draft ?? value;
  const visualPosition = useMotionValue(value);
  const boundedPosition = useTransform(visualPosition, (position) =>
    Math.max(0, Math.min(5, position)),
  );
  const thumbOffset = useTransform(boundedPosition, zoomStopPosition);
  const fillLength = useTransform(
    boundedPosition,
    (position) => `calc(${36 * (1 - position / 5)}px + ${position * 20}%)`,
  );
  useEffect(() => {
    if (reduced || keyboardInteraction) {
      visualPosition.jump(current);
      return;
    }
    const animation = animate(visualPosition, current, {
      type: "spring",
      duration: 0.28,
      bounce: 0.12,
      onComplete: () => visualPosition.jump(current),
    });
    return () => animation.stop();
  }, [current, reduced, keyboardInteraction, visualPosition]);
  const control = (
    <div
      className="zoom-control"
      data-orientation={vertical ? "vertical" : "horizontal"}
    >
      <div className="zoom-track">
        <motion.div
          className="zoom-fill"
          style={vertical ? { height: fillLength } : { width: fillLength }}
        />
        {zoomLevels.map((_, index) => (
          <span
            key={index}
            className={`zoom-dot ${index <= current ? "is-filled" : ""}`}
            style={{
              [vertical ? "bottom" : "left"]: zoomStopPosition(index),
            }}
          />
        ))}
        <motion.span
          className="zoom-thumb"
          style={
            vertical
              ? { bottom: thumbOffset, transform: "translateY(50%)" }
              : { left: thumbOffset, transform: "translateX(-50%)" }
          }
        />
        <Slider
          orientation={vertical ? "vertical" : "horizontal"}
          className="map-zoom-slider [&_[data-slot=slider-thumb]]:size-9"
          aria-label="Map zoom level"
          aria-valuetext={zoomLabels[current]}
          value={[current]}
          min={0}
          max={5}
          step={1}
          largeStep={1}
          onPointerDownCapture={() => visualPosition.jump(current)}
          onKeyDownCapture={() => visualPosition.jump(current)}
          onPointerCancel={() => {
            visualPosition.jump(value);
            setDraft(null);
          }}
          onValueChange={(next, details) => {
            setKeyboardInteraction(details.reason === "keyboard");
            const stop = Math.round(Array.isArray(next) ? next[0] : next);
            if (stop !== current && details.reason !== "none")
              selectionFeedback();
            setDraft(stop);
          }}
          onValueCommitted={(next) => {
            const stop = Math.round(Array.isArray(next) ? next[0] : next);
            setDraft(null);
            onChange(stop === 0 ? "globe" : "map", zoomLevels[stop] || 1);
          }}
        />
      </div>
    </div>
  );
  if (vertical) return control;
  return (
    <Popover
      onOpenChange={(open, details) => {
        setKeyboardInteraction(
          "key" in details.event ||
            (details.event.type === "click" &&
              "detail" in details.event &&
              details.event.detail === 0),
        );
        if (!open) {
          visualPosition.jump(value);
          setDraft(null);
        }
      }}
    >
      <PopoverTrigger
        ref={trigger}
        render={<Button variant="quiet" aria-label="Map zoom" />}
      >
        <span className="map-zoom-icon" aria-hidden="true">
          <AnimatePresence initial={false}>
            <motion.span
              key={mode}
              initial={
                reduced || keyboardInteraction
                  ? false
                  : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
              }
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={
                reduced || keyboardInteraction
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
              }
              transition={
                reduced || keyboardInteraction
                  ? { duration: 0 }
                  : { type: "spring", duration: 0.3, bounce: 0 }
              }
            >
              {mode === "globe" ? <Globe2 size={18} /> : <MapIcon size={18} />}
            </motion.span>
          </AnimatePresence>
        </span>
      </PopoverTrigger>
      <PopoverContent
        anchor={() =>
          trigger.current?.closest(".explorer-command-bar") ?? trigger.current
        }
        align="center"
        side="top"
        sideOffset={12}
        data-keyboard={keyboardInteraction}
        className="map-zoom-popover explorer-overlay w-[236px] gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] data-open:animate-none data-closed:animate-none data-ending-style:duration-100 data-[keyboard=true]:transition-none motion-reduce:transition-none"
      >
        <PopoverTitle className="sr-only">Map zoom</PopoverTitle>
        {control}
      </PopoverContent>
    </Popover>
  );
}
