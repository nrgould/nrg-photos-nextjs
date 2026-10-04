"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type {
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import { travelPlaces, type TravelPlace } from "@/lib/places";
import { getMapNodes, type MapNode } from "@/lib/map-hierarchy";
import {
  continuousProjection,
  constrainCamera,
  engineZoom,
  markerLevel,
  markerLabels,
  markerOffsets,
  uiZoom,
  type MarkerLevel,
} from "@/lib/map-camera";
import { Button } from "./ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

function colors() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const dark = document.documentElement.dataset.photoTheme === "dark";
  return {
    water: token(dark ? "--explorer-water-dark" : "--explorer-water-light"),
    land: token(dark ? "--explorer-land-dark" : "--explorer-land-light"),
    edge: token(dark ? "--neutral-600" : "--neutral-500"),
    grid: token(dark ? "--neutral-700" : "--neutral-200"),
    label: token(dark ? "--neutral-300" : "--neutral-600"),
  };
}
function style(): StyleSpecification {
  const color = colors();
  const font = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-explorer-sans")
    .split(",")[0]
    .trim()
    .replaceAll('"', "");
  return {
    version: 8,
    projection: continuousProjection,
    sources: {
      land: {
        type: "geojson",
        data: "/maps/land.json",
        attribution: "Natural Earth",
      },
      grid: { type: "geojson", data: "/maps/grid.json" },
      boundaries: { type: "geojson", data: "/maps/boundaries.json" },
      countries: { type: "geojson", data: "/maps/country-labels.json" },
      cities: { type: "geojson", data: "/maps/city-labels.json" },
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
      {
        id: "boundaries",
        type: "line",
        source: "boundaries",
        minzoom: 0.8,
        paint: {
          "line-color": color.edge,
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.45, 4, 0.8],
          "line-opacity": 0.65,
        },
      },
      ...(["countries", "cities"] as const).map((source) => ({
        id: `${source}-labels`,
        type: "symbol" as const,
        source,
        minzoom: source === "cities" ? 3.2 : 0,
        ...(source === "countries"
          ? {
              filter: [
                "<=",
                ["min", 3, ["get", "minZoom"]],
                ["zoom"],
              ] as import("maplibre-gl").FilterSpecification,
            }
          : {}),
        layout: {
          "text-field": [
            "get",
            "name",
          ] as import("maplibre-gl").ExpressionSpecification,
          "text-font": [font || "sans-serif", "sans-serif"],
          "text-size": source === "countries" ? 12 : 10,
          "text-max-width": 9,
          "text-padding": source === "countries" ? 12 : 10,
          "symbol-sort-key": [
            "get",
            "rank",
          ] as import("maplibre-gl").ExpressionSpecification,
        },
        paint: {
          "text-color": color.label,
          "text-halo-color": color.land,
          "text-halo-width": 1.5,
          "text-opacity": source === "countries" ? 0.9 : 0.75,
        },
      })),
    ],
  };
}
export default function PlacesMap(props: {
  selected: string | null;
  selectedNodeId?: string | null;
  places: TravelPlace[];
  canvasOpen: boolean;
  mode: "globe" | "map";
  zoom: number;
  intro: boolean;
  revision: number;
  zoomRevision: number;
  theme: "light" | "dark";
  onChoose: (id: string) => void;
  onChooseNode?: (node: MapNode) => void;
  onIntroEnd: () => void;
  onZoomChange: (zoom: number, mode: "globe" | "map") => void;
}) {
  const {
    selected,
    selectedNodeId,
    revision,
    zoomRevision,
    canvasOpen,
    mode,
    zoom,
    intro,
  } = props;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hosts, setHosts] = useState<Map<string, HTMLElement>>(new Map());
  const markers = useRef(new Map<string, { marker: Marker; node: MapNode }>());
  const MarkerClass = useRef<typeof import("maplibre-gl").Marker | null>(null);
  const [level, setLevel] = useState<MarkerLevel>(() =>
    markerLevel(mode === "globe" ? 0 : engineZoom(zoom), "country"),
  );
  const liveLevel = useRef(level);
  const nodes = useMemo(
    () => getMapNodes(props.places, level),
    [props.places, level],
  );
  const allNodes = useMemo(
    () => [
      ...getMapNodes(props.places, "country"),
      ...getMapNodes(props.places, "location"),
    ],
    [props.places],
  );
  const navigationTarget = useRef<[number, number] | null>(null);
  const gestureMoved = useRef(false);
  const nativeSync = useRef<{
    mode: "globe" | "map";
    zoom: number;
    revision: number;
  } | null>(null);
  const focus = useRef({
    selected: props.selected,
    selectedNodeId: props.selectedNodeId,
    revision: -1,
    canvasOpen: props.canvasOpen,
    mode: props.mode,
    zoom: props.zoom,
    zoomRevision: props.zoomRevision,
  });

  useEffect(() => {
    let cancelled = false;
    const markerInstances = markers.current;
    let resize: ResizeObserver | undefined;
    import("maplibre-gl")
      .then(async ({ Map: MapConstructor, Marker, LngLat, setWorkerUrl }) => {
        await document.fonts.ready;
        if (cancelled || !container.current) return;
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        MarkerClass.current = Marker;
        const initial = latest.current;
        const instance = new MapConstructor({
          container: container.current,
          style: style(),
          center: initial.intro
            ? [-30, 20]
            : (travelPlaces.find((place) => place.id === initial.selected)
                ?.coordinates ?? [-30, 20]),
          zoom: initial.mode === "globe" ? 0 : engineZoom(initial.zoom),
          minZoom: 0,
          maxZoom: engineZoom(10),
          transformConstrain: (center, zoom) => {
            const camera = constrainCamera(center, zoom);
            return {
              center: new LngLat(camera.longitude, camera.latitude),
              zoom: camera.zoom,
            };
          },
          renderWorldCopies: true,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
          attributionControl: false,
          canvasContextAttributes: { antialias: true },
        });
        instance.touchZoomRotate.disableRotation();
        instance.keyboard.disableRotation();
        map.current = instance;
        instance
          .getCanvas()
          .setAttribute(
            "aria-label",
            "Photographed places. Drag to pan, pinch to zoom, or use arrow keys and plus or minus.",
          );
        instance.on("load", () => {
          if (cancelled) return;
          setReady(true);
        });
        instance.on("zoom", () => {
          const next = markerLevel(instance.getZoom(), liveLevel.current);
          if (next !== liveLevel.current) {
            liveLevel.current = next;
            setLevel(next);
          }
        });
        instance.on("render", () => {
          const { clientWidth: width, clientHeight: height } =
            instance.getCanvas();
          const anchors = [...markers.current].flatMap(
            ([id, { marker, node }]) => {
              const element = marker.getElement();
              if (element.classList.contains("maplibregl-marker-covered"))
                return [];
              const point = instance.project(marker.getLngLat());
              if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
                return [];
              return [
                {
                  id,
                  x: point.x,
                  y: point.y,
                  priority:
                    latest.current.selectedNodeId === id ||
                    (!latest.current.selectedNodeId &&
                      latest.current.selected === node.collectionId) ||
                    element.contains(document.activeElement),
                },
              ];
            },
          );
          const offsets = markerOffsets(anchors, {
            width,
            height,
          });
          const widths = new Map(
            anchors.map(({ id }) => {
              const element = markers.current.get(id)!.marker.getElement();
              const label =
                element.querySelector<HTMLElement>(".map-marker-label");
              if (label && element.dataset.labelText !== label.textContent) {
                element.dataset.labelText = label.textContent ?? "";
                element.dataset.labelWidth = String(label.offsetWidth);
              }
              return [id, Number(element.dataset.labelWidth ?? 0)] as const;
            }),
          );
          const labels = markerLabels(anchors, offsets, widths);
          for (const [id, offset] of offsets) {
            const element = markers.current.get(id)!.marker.getElement();
            const key = `${offset.x},${offset.y}`;
            if (element.dataset.callout !== key) {
              element.style.setProperty("--callout-x", `${offset.x}px`);
              element.style.setProperty("--callout-y", `${offset.y}px`);
              element.dataset.callout = key;
            }
            const label = labels.get(id)!;
            if (element.dataset.labelSide !== label.side)
              element.dataset.labelSide = label.side;
            if (element.dataset.labelHidden !== String(label.hidden))
              element.dataset.labelHidden = String(label.hidden);
            const path = element.querySelector("path");
            const line = `M0 0L${offset.x} ${offset.y}`;
            if (path?.getAttribute("d") !== line) path?.setAttribute("d", line);
          }
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
          nativeSync.current = {
            mode: nextMode,
            zoom: uiZoom(instance.getZoom()),
            revision: latest.current.zoomRevision,
          };
          latest.current.onZoomChange(uiZoom(instance.getZoom()), nextMode);
        });
        instance.on("error", (event) => {
          if ("sourceId" in event && event.sourceId !== "land") {
            console.warn("Optional map context unavailable", event.error);
            return;
          }
          console.error("Map failed to load", event.error);
          setFailed(true);
        });
        instance.on("sourcedata", (event) => {
          if (event.sourceId === "land" && event.isSourceLoaded)
            setFailed(false);
        });
        const observer = new ResizeObserver(() => {
          instance.resize();
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
      markerInstances.forEach(({ marker }) => marker.remove());
      markerInstances.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const Constructor = MarkerClass.current;
    if (!ready || !instance || !Constructor) return;
    const ids = new Set(nodes.map((node) => node.id));
    for (const [id, { marker }] of markers.current) {
      if (!ids.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
    for (const node of nodes) {
      const existing = markers.current.get(node.id);
      if (existing) {
        existing.node = node;
        existing.marker.setLngLat(node.coordinates);
        continue;
      }
      const element = document.createElement("div");
      element.className = "map-thumbnail-host";
      element.style.setProperty("--callout-x", "0px");
      element.style.setProperty("--callout-y", "-28px");
      element.dataset.labelSide = "above";
      const marker = new Constructor({
        element,
        anchor: "center",
        subpixelPositioning: true,
        opacityWhenCovered: 0,
      })
        .setLngLat(node.coordinates)
        .addTo(instance);
      markers.current.set(node.id, { marker, node });
    }
    setHosts(
      new Map(
        [...markers.current].map(([id, { marker }]) => [
          id,
          marker.getElement(),
        ]),
      ),
    );
    instance.triggerRepaint();
  }, [nodes, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const color = colors();
    instance.setPaintProperty("water", "background-color", color.water);
    instance.setPaintProperty("land", "fill-color", color.land);
    instance.setPaintProperty("edge", "line-color", color.edge);
    instance.setPaintProperty("grid", "line-color", color.grid);
    instance.setPaintProperty("boundaries", "line-color", color.edge);
    for (const layer of ["countries-labels", "cities-labels"]) {
      instance.setPaintProperty(layer, "text-color", color.label);
      instance.setPaintProperty(layer, "text-halo-color", color.land);
    }
  }, [props.theme, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !container.current) return;
    const previous = focus.current;
    focus.current = {
      selected,
      selectedNodeId,
      revision,
      canvasOpen,
      mode,
      zoom,
      zoomRevision,
    };
    if (selected === null && previous.selected !== null) {
      instance.stop();
      navigationTarget.current = null;
      nativeSync.current = null;
      return;
    }
    const selectedPlace = travelPlaces.find((place) => place.id === selected);
    const selectedNode = allNodes.find((node) => node.id === selectedNodeId);
    const recenter =
      previous.selected !== selected ||
      previous.selectedNodeId !== selectedNodeId ||
      previous.revision !== revision ||
      previous.canvasOpen !== canvasOpen;
    const synced = nativeSync.current;
    nativeSync.current = null;
    if (
      !recenter &&
      synced?.mode === mode &&
      synced.zoom === zoom &&
      synced.revision === zoomRevision
    )
      return;
    const zoomRequested =
      previous.mode !== mode ||
      previous.zoom !== zoom ||
      previous.zoomRevision !== zoomRevision;
    if (!recenter && !zoomRequested) return;
    const targetZoom = mode === "globe" ? 0 : engineZoom(zoom);
    if (!recenter && Math.abs(instance.getZoom() - targetZoom) < 0.001) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    instance.stop();
    const { width, height } = container.current.getBoundingClientRect();
    const finish = () => latest.current.onIntroEnd();
    if (intro) instance.once("moveend", finish);
    const targetCenter =
      navigationTarget.current ??
      (selectedNode?.kind === "country"
        ? selectedPlace?.coordinates
        : selectedNode?.coordinates) ??
      selectedPlace?.coordinates;
    navigationTarget.current = null;
    instance.easeTo({
      ...(recenter && targetCenter ? { center: targetCenter } : {}),
      zoom: targetZoom,
      // Selection offsets frame the drawer without leaving projection-dependent padding behind.
      offset:
        recenter && canvasOpen
          ? width > 700
            ? [-205, 0]
            : [0, -height * 0.125]
          : [0, 0],
      duration: reduced ? 0 : intro ? 2200 : 650,
      easing: (t) => 1 - (1 - t) ** 3,
    });
    if (intro) {
      return () => {
        instance.off("moveend", finish);
      };
    }
  }, [
    selected,
    selectedNodeId,
    allNodes,
    revision,
    zoomRevision,
    canvasOpen,
    mode,
    zoom,
    intro,
    ready,
  ]);

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
        {props.places.map((place) => (
          <Button
            key={place.id}
            variant="control"
            data-location={place.id}
            tabIndex={failed ? 0 : -1}
            onClick={() => props.onChoose(place.id)}
          >
            {place.name}
          </Button>
        ))}
      </div>
      {nodes.map((node) => {
        const host = hosts.get(node.id);
        if (!host) return null;
        return createPortal(
          <>
            <svg
              className="map-marker-leader"
              viewBox="-44 -44 88 88"
              aria-hidden="true"
            >
              <path d="M0 0L0 -28" />
              <circle cx="0" cy="0" r="3.5" />
            </svg>
            <Button
              variant="quiet"
              press={false}
              className="map-photo-marker"
              data-location={node.collectionId}
              data-map-node={node.id}
              data-node-kind={node.kind}
              aria-label={`Explore ${node.label}, ${node.photoCount} ${node.photoCount === 1 ? "photograph" : "photographs"}`}
              title={`${node.referenceLabel} · ${node.precision === "country" ? "Country collection" : "Regional reference"}, not camera GPS`}
              aria-pressed={
                selectedNodeId
                  ? selectedNodeId === node.id
                  : props.selected === node.collectionId
              }
              onClick={(event) => {
                if (event.detail !== 0 && gestureMoved.current) return;
                navigationTarget.current =
                  node.kind === "country"
                    ? (travelPlaces.find(
                        (place) => place.id === node.collectionId,
                      )?.coordinates ?? node.coordinates)
                    : node.coordinates;
                if (props.onChooseNode) props.onChooseNode(node);
                else props.onChoose(node.collectionId);
                if (node.kind === "country")
                  props.onZoomChange(
                    Math.max(3.5, uiZoom(map.current?.getZoom() ?? 0)),
                    "map",
                  );
              }}
            >
              {node.kind === "country" &&
                node.photos
                  .slice(1, 3)
                  .reverse()
                  .map((photo, index) => (
                    <span
                      className="map-marker-stack-layer"
                      data-layer={index}
                      key={photo.src}
                      aria-hidden="true"
                    >
                      <Image
                        src={photo.src}
                        alt=""
                        width={44}
                        height={44}
                        sizes="44px"
                        quality={75}
                        draggable={false}
                      />
                    </span>
                  ))}
              <Image
                className="map-marker-cover"
                src={node.cover.src}
                alt=""
                width={44}
                height={44}
                sizes="44px"
                quality={75}
                draggable={false}
              />
              {node.photoCount > 1 && (
                <span className="map-marker-count" aria-hidden="true">
                  {node.photoCount}
                </span>
              )}
              <span className="map-marker-label">{node.label}</span>
            </Button>
          </>,
          host,
          node.id,
        );
      })}
      <span className="map-attribution">Natural Earth</span>
    </div>
  );
}
