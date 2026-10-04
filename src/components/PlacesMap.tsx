"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { flatFrame, globeFrame, shortestTurn, zoomStops } from "@/lib/globe";
import { travelPlaces } from "@/lib/places";

export default function PlacesMap({
  selected,
  canvasOpen,
  mode,
  zoom,
  intro,
  onChoose,
  onIntroEnd,
  revision,
}: {
  selected: number;
  canvasOpen: boolean;
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
  const [camera, setCamera] = useState({
    center: place.coordinates,
    zoom: 1,
    offset: [0, 0] as [number, number],
  });
  const cameraRef = useRef(camera);
  const flight = useRef<{ stop: () => void } | null>(null);
  const reducedMotion = useReducedMotion();
  const [view, setView] = useState<[number, number]>([-30, 20]);
  const viewRef = useRef(view);
  const pointer = useRef<{
    x: number;
    y: number;
    center: [number, number];
    id: number;
    zoom: number;
  } | null>(null);
  const end = useRef(onIntroEnd);
  useEffect(() => {
    end.current = onIntroEnd;
  }, [onIntroEnd]);
  useEffect(() => {
    const from = viewRef.current;
    const animation = animate(0, 1, {
      duration: reducedMotion ? 0 : intro ? 2.2 : 0.65,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (progress) => {
        const next: [number, number] = [
          from[0] + shortestTurn(from[0], place.coordinates[0]) * progress,
          from[1] + (place.coordinates[1] - from[1]) * progress,
        ];
        viewRef.current = next;
        setView(next);
      },
      onComplete: () => {
        if (intro) end.current();
      },
    });
    return () => animation.stop();
  }, [intro, place, reducedMotion]);
  useEffect(() => {
    if (mode !== "map") return;
    const from = cameraRef.current;
    const target = {
      center: place.coordinates,
      zoom: zoomStops[zoom],
      offset: (canvasOpen
        ? size[0] <= 700
          ? [0, -size[1] * 0.125]
          : [-180, 0]
        : [0, 0]) as [number, number],
    };
    const animation = animate(0, 1, {
      duration: reducedMotion ? 0 : 0.65,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (progress) => {
        const next = {
          center: from.center.map(
            (v, i) => v + (target.center[i] - v) * progress,
          ) as [number, number],
          zoom: from.zoom + (target.zoom - from.zoom) * progress,
          offset: from.offset.map(
            (v, i) => v + (target.offset[i] - v) * progress,
          ) as [number, number],
        };
        cameraRef.current = next;
        setCamera(next);
      },
    });
    flight.current = animation;
    return () => animation.stop();
  }, [place, zoom, revision, mode, canvasOpen, size, reducedMotion]);
  const points = travelPlaces.map((p) => p.coordinates);
  const geometry =
    mode === "globe"
      ? globeFrame(view, points)
      : flatFrame(camera.center, camera.zoom, points, size, camera.offset);
  function moveCenter(center: [number, number]) {
    flight.current?.stop();
    const next = { ...cameraRef.current, center };
    cameraRef.current = next;
    setCamera(next);
  }
  const width = mode === "globe" ? 560 : size[0];
  const height = mode === "globe" ? 560 : size[1];
  function pan(dx: number, dy: number) {
    const c = cameraRef.current.center;
    moveCenter([
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
          flight.current?.stop();
          pointer.current = {
            x: e.clientX,
            y: e.clientY,
            center: cameraRef.current.center,
            zoom: cameraRef.current.zoom,
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
              (125 * p.zoom)) *
              180) /
            Math.PI;
          moveCenter([
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
        <g
          className="map-world"
          transform={
            "transform" in geometry ? String(geometry.transform) : undefined
          }
        >
          <path
            d={geometry.grid}
            className="explorer-graticule"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={geometry.land}
            className="explorer-land"
            vectorEffect="non-scaling-stroke"
          />
        </g>
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
    </div>
  );
}
