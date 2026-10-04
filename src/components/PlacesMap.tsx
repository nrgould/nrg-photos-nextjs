"use client";
import { useEffect, useRef, useState } from "react";
import { flatFrame, globeFrame, shortestTurn, zoomStops } from "@/lib/globe";
import { travelPlaces } from "@/lib/places";

export default function PlacesMap({
  selected,
  mode,
  zoom,
  intro,
  onChoose,
  onIntroEnd,
  revision,
}: {
  selected: number;
  mode: "globe" | "map";
  zoom: number;
  intro: boolean;
  revision: number;
  onChoose: (index: number) => void;
  onIntroEnd: () => void;
}) {
  const place = travelPlaces[selected];
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<[number, number]>([840, 560]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize([entry.contentRect.width, entry.contentRect.height]),
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const [center, setCenter] = useState<[number, number]>(place.coordinates);
  const [view, setView] = useState<[number, number]>([-30, 20]);
  const pointer = useRef<{
    x: number;
    y: number;
    center: [number, number];
    id: number;
  } | null>(null);
  const end = useRef(onIntroEnd);
  useEffect(() => {
    end.current = onIntroEnd;
  }, [onIntroEnd]);
  useEffect(() => {
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const t = Math.min((now - start) / 2200, 1);
      const ease = 1 - (1 - t) ** 3;
      if (intro && !reduced.matches)
        setView([
          -30 + shortestTurn(-30, place.coordinates[0]) * ease,
          20 + (place.coordinates[1] - 20) * ease,
        ]);
      else setView(place.coordinates);
      if (intro && !reduced.matches && t < 1)
        frame = requestAnimationFrame(tick);
      else if (intro) end.current();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [intro, place]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setCenter(place.coordinates));
    return () => cancelAnimationFrame(frame);
  }, [place, zoom, revision]);
  const hadIntro = useRef(intro);
  const [arrivalZoom, setArrivalZoom] = useState<number | null>(null);
  useEffect(() => {
    const arriving = hadIntro.current && !intro && mode === "map";
    hadIntro.current = intro;
    let frame = 0;
    let started: number | undefined;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const tick = (now: number) => {
      if (!arriving || reduced) {
        setArrivalZoom(null);
        return;
      }
      started ??= now;
      const t = Math.min((now - started) / 750, 1);
      setArrivalZoom(
        t === 1 ? null : 1 + (zoomStops[zoom] - 1) * (1 - (1 - t) ** 3),
      );
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [intro, mode, zoom, selected]);
  const points = travelPlaces.map((p) => p.coordinates);
  const geometry =
    mode === "globe"
      ? globeFrame(view, points)
      : flatFrame(center, arrivalZoom ?? zoomStops[zoom], points, size);
  const width = mode === "globe" ? 560 : size[0];
  const height = mode === "globe" ? 560 : size[1];
  function pan(dx: number, dy: number) {
    setCenter((c) => [
      Math.max(-180, Math.min(180, c[0] + dx)),
      Math.max(-75, Math.min(75, c[1] + dy)),
    ]);
  }
  return (
    <div
      ref={container}
      className={`explorer-map ${mode === "globe" ? "is-globe" : "is-flat"} ${intro ? "is-intro" : ""}`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label={
          mode === "map"
            ? "Map. Drag or use arrow keys to pan."
            : "Globe of photographed places"
        }
        tabIndex={mode === "map" ? 0 : undefined}
        onKeyDown={(e) => {
          if (mode !== "map" || e.target !== e.currentTarget) return;
          const step = 10 / zoomStops[zoom];
          const keys: Record<string, [number, number]> = {
            ArrowLeft: [-step, 0],
            ArrowRight: [step, 0],
            ArrowUp: [0, step],
            ArrowDown: [0, -step],
          };
          if (keys[e.key]) {
            e.preventDefault();
            pan(...keys[e.key]);
          }
        }}
        onPointerDown={(e) => {
          if (
            mode !== "map" ||
            (e.target as Element).closest("[data-location]")
          )
            return;
          if (pointer.current) return;
          pointer.current = {
            x: e.clientX,
            y: e.clientY,
            center,
            id: e.pointerId,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = pointer.current;
          if (!p || p.id !== e.pointerId) return;
          const scale =
            ((width /
              e.currentTarget.getBoundingClientRect().width /
              (125 * zoomStops[zoom])) *
              180) /
            Math.PI;
          setCenter([
            Math.max(
              -180,
              Math.min(180, p.center[0] - (e.clientX - p.x) * scale),
            ),
            Math.max(
              -75,
              Math.min(
                75,
                p.center[1] +
                  (e.clientY - p.y) *
                    scale *
                    Math.cos((p.center[1] * Math.PI) / 180),
              ),
            ),
          ]);
        }}
        onPointerUp={() => {
          pointer.current = null;
        }}
        onPointerCancel={() => {
          pointer.current = null;
        }}
      >
        {mode === "globe" && (
          <circle cx="280" cy="280" r="251" className="explorer-ocean" />
        )}
        <path d={geometry.grid} className="explorer-graticule" />
        <path d={geometry.land} className="explorer-land" />
        {geometry.points.map(
          (point, index) =>
            point.visible &&
            point.position && (
              <g
                key={travelPlaces[index].id}
                data-location
                role="button"
                tabIndex={0}
                aria-label={`Explore ${travelPlaces[index].name}`}
                aria-pressed={selected === index}
                transform={`translate(${point.position[0]},${point.position[1]})`}
                className={`explorer-marker ${selected === index ? "is-selected" : ""}`}
                onClick={() => onChoose(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChoose(index);
                  }
                }}
              >
                <circle className="marker-target" r="20" />
                <circle
                  className="marker-halo"
                  r={selected === index ? 13 : 9}
                />
                <circle className="marker-dot" r="4" />
                <text x="20" y={index === 1 ? 23 : -15}>
                  {travelPlaces[index].name}
                </text>
              </g>
            ),
        )}
      </svg>
      <div className="map-index">
        <span>FIELD NOTES / 01—04</span>
        <span>
          {mode === "map"
            ? "Drag to explore · arrow keys to pan"
            : "A few places, a different perspective"}
        </span>
      </div>
    </div>
  );
}
