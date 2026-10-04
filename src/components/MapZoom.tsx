"use client";
import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { Globe2, ZoomIn } from "lucide-react";
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
  const reduced = useReducedMotion();
  const spring = useSpring(value, { stiffness: 420, damping: 25, mass: 0.7 });
  const x = useTransform(spring, (v) => 2 + v * 35.2);
  const scaleX = useTransform(spring, (v) => (36 + v * 35.2) / 212);
  useEffect(() => {
    if (reduced) spring.jump(value);
    else spring.set(value);
  }, [value, reduced, spring]);
  const current = draft ?? value;
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="quiet" aria-label="Map zoom" />}>
        {mode === "globe" ? <Globe2 size={18} /> : <ZoomIn size={18} />}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={12}
        className="map-zoom-popover explorer-overlay w-[262px] rounded-[14px] border border-line bg-paper p-3 text-foreground"
      >
        <div className="zoom-popover-heading">
          <PopoverTitle className="text-[13px] leading-none">Zoom</PopoverTitle>
          <span>{labels[Math.round(current)]}</span>
        </div>
        <div className="zoom-control">
          <div className="zoom-track">
            <motion.div
              className="zoom-fill"
              style={{ width: 212, scaleX, transformOrigin: "left" }}
            />
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
                              Math.round(current) +
                                (number > current
                                  ? 1
                                  : number < current
                                    ? -1
                                    : 0),
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
        <div className="zoom-popover-labels">
          <span>Globe</span>
          <span>Local</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
