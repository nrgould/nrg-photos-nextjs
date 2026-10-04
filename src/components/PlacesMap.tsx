"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type {
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import { travelPlaces } from "@/lib/places";
import { Button } from "./ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

const engineZoom = (scale: number) => Math.log2((scale * 250 * Math.PI) / 512);
const uiZoom = (zoom: number) =>
  Math.max(1, Math.min(10, (2 ** zoom * 512) / (250 * Math.PI)));
function colors() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const dark = document.documentElement.dataset.photoTheme === "dark";
  return {
    water: token(dark ? "--neutral-900" : "--neutral-50"),
    land: token(dark ? "--neutral-800" : "--neutral-200"),
    edge: token(dark ? "--neutral-600" : "--neutral-500"),
    grid: token(dark ? "--neutral-700" : "--neutral-200"),
  };
}
function style(): StyleSpecification {
  const color = colors();
  return {
    version: 8,
    sources: {
      land: {
        type: "geojson",
        data: "/maps/land.json",
        attribution: "Natural Earth",
      },
      grid: { type: "geojson", data: "/maps/grid.json" },
    },
    layers: [
      {
        id: "water",
        type: "background",
        paint: { "background-color": color.water },
      },
      {
        id: "grid",
        type: "line",
        source: "grid",
        paint: { "line-color": color.grid, "line-width": 0.6 },
      },
      {
        id: "land",
        type: "fill",
        source: "land",
        paint: { "fill-color": color.land },
      },
      {
        id: "edge",
        type: "line",
        source: "land",
        paint: { "line-color": color.edge, "line-width": 0.6 },
      },
    ],
  };
}
export default function PlacesMap(props: {
  selected: number;
  canvasOpen: boolean;
  mode: "globe" | "map";
  zoom: number;
  intro: boolean;
  revision: number;
  zoomRevision: number;
  theme: "light" | "dark";
  onChoose: (index: number) => void;
  onIntroEnd: () => void;
  onZoomChange: (zoom: number, mode: "globe" | "map") => void;
}) {
  const { selected, revision, zoomRevision, canvasOpen, mode, zoom, intro } =
    props;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hosts, setHosts] = useState<HTMLElement[]>([]);
  const markers = useRef<Marker[]>([]);
  const gestureMoved = useRef(false);
  const nativeSync = useRef<{
    mode: "globe" | "map";
    zoom: number;
    revision: number;
  } | null>(null);
  const focus = useRef({
    selected: props.selected,
    revision: -1,
    canvasOpen: props.canvasOpen,
    mode: props.mode,
  });

  useEffect(() => {
    let cancelled = false;
    let resize: ResizeObserver | undefined;
    import("maplibre-gl")
      .then(({ Map, Marker, setWorkerUrl }) => {
        if (cancelled || !container.current) return;
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const initial = latest.current;
        const instance = new Map({
          container: container.current,
          style: style(),
          center: initial.intro
            ? [-30, 20]
            : travelPlaces[initial.selected].coordinates,
          zoom: initial.mode === "globe" ? 0 : engineZoom(initial.zoom),
          minZoom: 0,
          maxZoom: engineZoom(10),
          renderWorldCopies: true,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
        });
        instance.touchZoomRotate.disableRotation();
        map.current = instance;
        instance
          .getCanvas()
          .setAttribute(
            "aria-label",
            "Photographed places. Drag to pan, pinch to zoom, or use arrow keys and plus or minus.",
          );
        instance.on("load", () => {
          if (cancelled) return;
          instance.setProjection({
            type: latest.current.mode === "globe" ? "globe" : "mercator",
          });
          const elements = travelPlaces.map((place, index) => {
            const element = document.createElement("div");
            element.className = "map-thumbnail-host";
            const marker = new Marker({
              element,
              subpixelPositioning: true,
              opacityWhenCovered: 0,
              offset:
                index === 0 ? [-27, -10] : index === 1 ? [27, 10] : [0, 0],
            })
              .setLngLat(place.coordinates)
              .addTo(instance);
            markers.current.push(marker);
            return element;
          });
          setHosts(elements);
          setReady(true);
        });
        instance.on("dragstart", () => {
          gestureMoved.current = true;
        });
        instance.on("zoomstart", (event) => {
          if (event.originalEvent) gestureMoved.current = true;
        });
        instance.on("zoomend", (event) => {
          if (!event.originalEvent) return;
          const nextMode = instance.getZoom() < engineZoom(1) ? "globe" : "map";
          focus.current.mode = nextMode;
          nativeSync.current = {
            mode: nextMode,
            zoom: uiZoom(instance.getZoom()),
            revision: latest.current.zoomRevision,
          };
          instance.setProjection({
            type: nextMode === "globe" ? "globe" : "mercator",
          });
          latest.current.onZoomChange(uiZoom(instance.getZoom()), nextMode);
        });
        instance.on("error", (event) => {
          console.error("Map failed to load", event.error);
          setFailed(true);
        });
        const observer = new ResizeObserver(() => {
          instance.resize();
          if (!container.current) return;
          const { width, height } = container.current.getBoundingClientRect();
          instance.setPadding({
            top: 0,
            left: 0,
            right: latest.current.canvasOpen && width > 700 ? 410 : 0,
            bottom:
              latest.current.canvasOpen && width <= 700 ? height * 0.25 : 0,
          });
        });
        observer.observe(container.current);
        resize = observer;
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      resize?.disconnect();
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const color = colors();
    instance.setPaintProperty("water", "background-color", color.water);
    instance.setPaintProperty("land", "fill-color", color.land);
    instance.setPaintProperty("edge", "line-color", color.edge);
    instance.setPaintProperty("grid", "line-color", color.grid);
  }, [props.theme, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !container.current) return;
    const previous = focus.current;
    focus.current = { selected, revision, canvasOpen, mode };
    const recenter =
      previous.selected !== selected ||
      previous.revision !== revision ||
      previous.canvasOpen !== canvasOpen ||
      previous.mode !== mode;
    const synced = nativeSync.current;
    nativeSync.current = null;
    if (
      !recenter &&
      synced?.mode === mode &&
      synced.zoom === zoom &&
      synced.revision === zoomRevision
    )
      return;
    const targetZoom = mode === "globe" ? 0 : engineZoom(zoom);
    if (!recenter && Math.abs(instance.getZoom() - targetZoom) < 0.001) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    instance.stop();
    instance.setProjection({ type: mode === "globe" ? "globe" : "mercator" });
    const { width, height } = container.current.getBoundingClientRect();
    const finish = () => latest.current.onIntroEnd();
    if (intro) instance.once("moveend", finish);
    instance.easeTo({
      ...(recenter ? { center: travelPlaces[selected].coordinates } : {}),
      zoom: targetZoom,
      padding: {
        top: 0,
        left: 0,
        right: canvasOpen && width > 700 ? 410 : 0,
        bottom: canvasOpen && width <= 700 ? height * 0.25 : 0,
      },
      duration: reduced ? 0 : intro ? 2200 : 650,
      easing: (t) => 1 - (1 - t) ** 3,
    });
    if (intro) {
      return () => {
        instance.off("moveend", finish);
      };
    }
  }, [selected, revision, zoomRevision, canvasOpen, mode, zoom, intro, ready]);

  return (
    <div
      className="explorer-map maplibre-explorer"
      data-map-ready={ready}
      onPointerDownCapture={(event) => {
        if (event.isPrimary) gestureMoved.current = false;
      }}
    >
      <div
        ref={container}
        className="maplibre-surface"
        style={{ position: "absolute", inset: 0 }}
      />
      {(!ready || failed) && (
        <p className="map-load-status" role="status">
          {failed
            ? "Map unavailable. Choose a place to browse photographs."
            : "Loading map…"}
        </p>
      )}
      <div
        className={failed ? "map-fallback-places" : "sr-only"}
        aria-label="Photographed places"
        aria-hidden={!failed}
      >
        {travelPlaces.map((place, index) => (
          <Button
            key={place.id}
            variant="control"
            data-location={place.id}
            tabIndex={failed ? 0 : -1}
            onClick={() => props.onChoose(index)}
          >
            {place.name}
          </Button>
        ))}
      </div>
      {hosts.map((host, index) =>
        createPortal(
          <Button
            variant="quiet"
            press={false}
            className="map-photo-marker"
            data-location={travelPlaces[index].id}
            aria-label={`Explore ${travelPlaces[index].name}`}
            aria-pressed={props.selected === index}
            onClick={(event) => {
              if (event.detail === 0 || !gestureMoved.current)
                props.onChoose(index);
            }}
          >
            <Image
              src={travelPlaces[index].photos[0].src}
              alt=""
              width={44}
              height={44}
              sizes="44px"
              quality={75}
              draggable={false}
            />
            <span className="map-marker-label">{travelPlaces[index].name}</span>
          </Button>,
          host,
          travelPlaces[index].id,
        ),
      )}
      <span className="map-attribution">Natural Earth</span>
    </div>
  );
}
