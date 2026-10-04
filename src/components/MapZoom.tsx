"use client";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
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

const levels = [0, 1, 2, 3, 5, 10];
const labels = ["Globe", "World", "Continent", "Region", "Area", "Local"];
function stepForZoom(zoom: number) {
  const upper = levels.findIndex((value, index) => index > 0 && value >= zoom);
  if (upper <= 1) return 1;
  return (
    upper -
    1 +
    Math.log(zoom / levels[upper - 1]) /
      Math.log(levels[upper] / levels[upper - 1])
  );
}
export default function MapZoom({
  mode,
  zoom,
  onChange,
}: {
  mode: "globe" | "map";
  zoom: number;
  onChange: (mode: "globe" | "map", zoom: number) => void;
}) {
  const value = mode === "globe" ? 0 : stepForZoom(zoom);
  const [draft, setDraft] = useState<number | null>(null);
  const draftRef = useRef<number | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [keyboardInteraction, setKeyboardInteraction] = useState(false);
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 420, damping: 25, mass: 0.7 });
  const position = useTransform(spring, (v) => Math.max(0, Math.min(5, v)));
  const x = useTransform(position, (v) => 2 + v * 35.2);
  const fillWidth = useTransform(position, (v) => 36 + v * 35.2);
  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [value, reduced, spring]);
  const current = draft ?? value;
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
          draftRef.current = null;
          setDraft(null);
          if (reduced) spring.jump(value);
          else spring.set(value);
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
        side="top"
        sideOffset={12}
        data-keyboard={keyboardInteraction}
        className="map-zoom-popover explorer-overlay w-[236px] gap-0 rounded-none border-0 bg-transparent p-0 shadow-none ring-0 transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] data-open:animate-none data-closed:animate-none data-ending-style:duration-100 data-[keyboard=true]:transition-none motion-reduce:transition-none"
      >
        <PopoverTitle className="sr-only">Map zoom</PopoverTitle>
        <div className="zoom-control">
          <div className="zoom-track">
            <motion.div className="zoom-fill" style={{ width: fillWidth }} />
            {levels.map((_, index) => (
              <span
                key={index}
                className={`zoom-dot ${index <= current ? "is-filled" : ""}`}
                style={{ left: 18 + index * 35.2 }}
              />
            ))}
            <motion.span className="zoom-thumb" style={{ left: 0, x }} />
            <Slider
              className="map-zoom-slider"
              aria-label="Map zoom level"
              aria-valuetext={labels[Math.round(current)]}
              value={[current]}
              min={0}
              max={5}
              step={0.01}
              largeStep={1}
              onValueChange={(next, details) => {
                setKeyboardInteraction(details.reason === "keyboard");
                const number = Array.isArray(next) ? next[0] : next;
                const key = "key" in details.event ? details.event.key : "";
                const nextValue =
                  details.reason === "keyboard"
                    ? key === "Home"
                      ? 0
                      : key === "End"
                        ? 5
                        : Math.max(
                            0,
                            Math.min(
                              5,
                              number > current
                                ? Math.floor(current) + 1
                                : number < current
                                  ? Math.ceil(current) - 1
                                  : current,
                            ),
                          )
                    : number;
                draftRef.current = nextValue;
                setDraft(nextValue);
                if (details.reason === "drag" || reduced)
                  spring.jump(nextValue);
                else spring.set(nextValue);
              }}
              onValueCommitted={(next) => {
                const stop = Math.round(
                  draftRef.current ?? (Array.isArray(next) ? next[0] : next),
                );
                draftRef.current = null;
                setDraft(null);
                if (reduced) spring.jump(stop);
                else spring.set(stop);
                onChange(stop === 0 ? "globe" : "map", levels[stop] || 1);
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
