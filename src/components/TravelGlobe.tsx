"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { globeFrame, initialView, shortestTurn } from "@/lib/globe";
import type { TravelPlace } from "@/lib/places";
import PhotoStack from "./PhotoStack";
const labelAt = (position: number[], place: TravelPlace) => [
  position[0] + place.labelOffset[0],
  position[1] + place.labelOffset[1],
];
// Leader lines start at the pin ring so they never cross the marker.
const leaderStart = (place: TravelPlace, ring: number) => {
  const [dx, dy] = place.labelOffset;
  const length = Math.hypot(dx, dy) || 1;
  return [(dx / length) * ring, (dy / length) * ring];
};
export default function TravelGlobe({ places }: { places: TravelPlace[] }) {
  const [selection, setSelection] = useState({ index: 0 });
  const selected = selection.index;
  const [rotating, setRotating] = useState(false);
  const markerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const view = useRef<[number, number]>([...initialView]);
  const target = useRef<[number, number] | null>(null);
  const initial = globeFrame(
    initialView,
    places.map((p) => p.coordinates),
  );
  const place = places[selected];
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const landPath = svg.querySelector("[data-land]");
    const gridPath = svg.querySelector("[data-grid]");
    const pins = svg.querySelectorAll<SVGGElement>("[data-pin]");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false,
      frame = 0,
      last = 0;
    const draw = () => {
      const next = globeFrame(
        view.current,
        places.map((p) => p.coordinates),
      );
      landPath?.setAttribute("d", next.land);
      gridPath?.setAttribute("d", next.grid);
      next.points.forEach((point, i) => {
        const pin = pins[i];
        if (point.position)
          pin.setAttribute(
            "transform",
            `translate(${point.position[0]},${point.position[1]})`,
          );
        pin.style.visibility = point.visible ? "visible" : "hidden";
        const marker = markerRefs.current[i];
        if (marker && point.position) {
          const [x, y] = labelAt(point.position, places[i]);
          marker.style.left = `${x / 5.6}%`;
          marker.style.top = `${y / 5.6}%`;
          marker.style.visibility = point.visible ? "visible" : "hidden";
        }
      });
    };
    const tick = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const elapsed = last ? Math.min(now - last, 64) : 16;
      last = now;
      if (target.current) {
        const destination = target.current;
        const dx = shortestTurn(view.current[0], destination[0]);
        const dy = destination[1] - view.current[1];
        if (motion.matches || Math.abs(dx) + Math.abs(dy) < 0.05) {
          view.current = [...destination];
          target.current = null;
        } else {
          const step = 1 - Math.exp(-elapsed / 150);
          view.current = [
            view.current[0] + dx * step,
            view.current[1] + dy * step,
          ];
        }
      } else if (rotating && !motion.matches) {
        view.current[0] =
          ((view.current[0] + elapsed * 0.0035 + 180) % 360) - 180;
      }
      draw();
      if (target.current || (rotating && !motion.matches))
        frame = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        restart();
      },
      { threshold: 0.05 },
    );
    observer.observe(svg);
    motion.addEventListener("change", restart);
    document.addEventListener("visibilitychange", restart);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", restart);
      document.removeEventListener("visibilitychange", restart);
    };
  }, [places, rotating, selection]);
  function choose(index: number) {
    target.current = [...places[index].coordinates];
    setSelection({ index });
    setRotating(false);
  }
  return (
    <section
      id="places"
      className="travel-section"
      aria-labelledby="places-heading"
    >
      <div className="page-width">
        <div className="travel-heading">
          <h2 id="places-heading">Places</h2>
          <Link href="/" className="places-explore-link">
            Explore places & presets
          </Link>
        </div>
        <div className="travel-layout">
          <div className="globe-panel">
            <div
              className="globe-map"
              role="group"
              aria-label="Select a location on the globe"
            >
              <svg
                ref={svgRef}
                viewBox="0 0 560 560"
                className="travel-globe"
                aria-hidden="true"
                onClick={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const x =
                    ((event.clientX - bounds.left) * 560) / bounds.width;
                  const y =
                    ((event.clientY - bounds.top) * 560) / bounds.height;
                  const points = globeFrame(
                    view.current,
                    places.map((p) => p.coordinates),
                  ).points;
                  const nearest = points
                    .map((p, i) => ({
                      i,
                      distance:
                        p.visible && p.position
                          ? Math.hypot(p.position[0] - x, p.position[1] - y)
                          : Infinity,
                    }))
                    .sort((a, b) => a.distance - b.distance)[0];
                  if (nearest.distance < 70) choose(nearest.i);
                }}
              >
                <circle cx="280" cy="280" r="251" className="globe-ocean" />
                <path data-grid d={initial.grid} className="globe-grid" />
                <path data-land d={initial.land} className="globe-land" />
                {initial.points.map((point, i) => (
                  <g
                    key={places[i].id}
                    data-pin
                    transform={`translate(${point.position?.[0] ?? 0},${point.position?.[1] ?? 0})`}
                    style={{ visibility: point.visible ? "visible" : "hidden" }}
                    className={
                      i === selected ? "globe-pin is-selected" : "globe-pin"
                    }
                  >
                    <line
                      x1={leaderStart(places[i], i === selected ? 12 : 6)[0]}
                      y1={leaderStart(places[i], i === selected ? 12 : 6)[1]}
                      x2={places[i].labelOffset[0]}
                      y2={places[i].labelOffset[1]}
                      className="pin-leader"
                    />
                    <circle r={i === selected ? 12 : 6} className="pin-ring" />
                    <circle r={i === selected ? 4 : 2.5} className="pin-core" />
                  </g>
                ))}
              </svg>
              {initial.points.map((point, i) => (
                <button
                  key={places[i].id}
                  ref={(element) => {
                    markerRefs.current[i] = element;
                  }}
                  className={
                    places[i].labelOffset[0] < 0
                      ? "globe-marker is-left"
                      : "globe-marker"
                  }
                  style={{
                    left: `${labelAt(point.position ?? [0, 0], places[i])[0] / 5.6}%`,
                    top: `${labelAt(point.position ?? [0, 0], places[i])[1] / 5.6}%`,
                    visibility: point.visible ? "visible" : "hidden",
                  }}
                  aria-label={`Show photographs from ${places[i].name}`}
                  aria-pressed={selected === i}
                  onClick={() => choose(i)}
                >
                  {places[i].name}
                </button>
              ))}
            </div>
            <div className="globe-caption">
              <button
                className="globe-motion"
                onClick={() => setRotating(!rotating)}
                aria-label={
                  rotating ? "Pause globe rotation" : "Resume globe rotation"
                }
              >
                {rotating ? <Pause size={13} /> : <Play size={13} />}{" "}
                {rotating ? "Pause" : "Rotate"}
              </button>
            </div>
          </div>
          <div className="place-panel">
            <div
              className="place-choices"
              role="group"
              aria-label="Choose a photography location"
            >
              {places.map((item, i) => (
                <button
                  key={item.id}
                  aria-pressed={selected === i}
                  onClick={() => choose(i)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <PhotoStack key={place.id} place={place} />
          </div>
        </div>
      </div>
    </section>
  );
}
