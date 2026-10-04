"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { animate } from "motion";
import type {
  Map as MapLibreMap,
  Marker,
  StyleSpecification,
} from "maplibre-gl";
import { travelPlaces, type TravelPlace } from "@/lib/places";
import {
  getCountryChildBounds,
  getMapNodes,
  type MapNode,
} from "@/lib/map-hierarchy";
import {
  continuousProjection,
  apparentZoom,
  cameraZoom,
  constrainCamera,
  engineZoom,
  markerLevel,
  markerLabels,
  isZoomInput,
  isFlatFloorZoomOut,
  mapFillZoom,
  projectionDuration,
  projectionMode,
  projectionStateKey,
  takeZoomIntent,
  settleProjection,
  viewportZoomOffset,
  uiZoom,
  type MarkerLevel,
} from "@/lib/map-camera";
import {
  layoutMapMarkers,
  markerTargetVisible,
  type MarkerLayout,
} from "@/lib/map-marker-layout";
import { Button } from "./ui/button";
import "maplibre-gl/dist/maplibre-gl.css";

// Intro: an ease-in spin hands off to the ease-out settle at equal speed
// (2·spin/spinMs = 3·settle/settleMs), so the globe never jerks.
const introSpinMs = 1600;
const introSpinDegrees = 110;
const introSettleMs = 2200;
const introSettleDegrees =
  (2 * introSpinDegrees * introSettleMs) / (3 * introSpinMs);
// Desktop thumbnails render larger; marker layout runs in 48px marker units.
const desktopMarkerScale = 4 / 3;
// A wide screen shows more map at the same engine zoom, so each desktop zoom
// stop sits closer in.
const zoomOffset = () =>
  typeof window === "undefined"
    ? 0
    : viewportZoomOffset(window.innerWidth, window.innerHeight);
const mapFloor = () => Math.max(zoomOffset(), mapFillZoom(window.innerHeight));
const toEngineZoom = (scale: number) => engineZoom(scale) + zoomOffset();
const toUiZoom = (zoom: number) => uiZoom(zoom - zoomOffset());

function colors() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  const dark = document.documentElement.dataset.photoTheme === "dark";
  return {
    water: token(dark ? "--explorer-water-dark" : "--explorer-water-light"),
    land: token(dark ? "--explorer-land-dark" : "--explorer-land-light"),
    edge: token(dark ? "--neutral-600" : "--neutral-500"),
    label: token(dark ? "--neutral-300" : "--neutral-600"),
  };
}
function style(mix: number): StyleSpecification {
  const color = colors();
  const font = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-explorer-sans")
    .split(",")[0]
    .trim()
    .replaceAll('"', "");
  return {
    version: 8,
    projection: continuousProjection,
    state: { [projectionStateKey]: { default: mix } },
    sources: {
      land: {
        type: "geojson",
        data: "/maps/land.json",
        attribution: "Natural Earth",
      },
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
  const projection = useRef({
    mix: props.mode === "globe" ? 0 : 1,
    mode: props.mode,
  });
  const animateProjection = useRef<
    ((mode: "globe" | "map", instant: boolean) => void) | null
  >(null);
  const keyboardIntent = useRef(false);
  const nativeZoomIntent = useRef({ active: false });
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hosts, setHosts] = useState<
    Map<string, { element: HTMLElement; node: MapNode }>
  >(new Map());
  const markers = useRef(
    new Map<
      string,
      {
        marker: Marker;
        node: MapNode;
        placed: boolean;
        exiting?: boolean;
        exitTimer?: number;
        enterFrame?: number;
      }
    >(),
  );
  const markerLayout = useRef<MarkerLayout>({
    offsets: new Map(),
    unresolvedIds: [],
  });
  const markerLayoutDirty = useRef(true);
  const markerMembershipSeen = useRef(false);
  const MarkerClass = useRef<typeof import("maplibre-gl").Marker | null>(null);
  const [level, setLevel] = useState<MarkerLevel>(() =>
    markerLevel(
      toEngineZoom(mode === "globe" ? 0 : zoom),
      "country",
      toEngineZoom(3),
    ),
  );
  const liveLevel = useRef(level);
  const breakoutZoom = useRef(toEngineZoom(3));
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
    let projectionAnimation: ReturnType<typeof animate> | undefined;
    let removeKeyboard: (() => void) | undefined;
    const onKey = () => {
      keyboardIntent.current = true;
    };
    const onPointer = () => {
      keyboardIntent.current = false;
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("wheel", onPointer, true);
    import("maplibre-gl")
      .then(async ({ Map: MapConstructor, Marker, LngLat, setWorkerUrl }) => {
        await document.fonts.ready;
        if (cancelled || !container.current) return;
        setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        MarkerClass.current = Marker;
        const initial = latest.current;
        const selectedCenter = (travelPlaces.find(
          (place) => place.id === initial.selected,
        )?.coordinates ?? [-30, 20]) as [number, number];
        // The intro spins in from the far side of the globe.
        const initialCenter: [number, number] = initial.intro
          ? [selectedCenter[0] - introSpinDegrees - introSettleDegrees, 20]
          : selectedCenter;
        const instance = new MapConstructor({
          container: container.current,
          style: style(projection.current.mix),
          center: initialCenter,
          zoom: cameraZoom(
            toEngineZoom(initial.mode === "globe" ? 0 : initial.zoom),
            initialCenter[1],
            projection.current.mix,
          ),
          minZoom: 0,
          maxZoom: toEngineZoom(10),
          transformConstrain: (center, zoom) => {
            const camera = constrainCamera(
              center,
              zoom,
              projection.current.mix,
              projection.current.mode,
              zoomOffset(),
              window.innerHeight,
            );
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
        const finishNativeZoom = (
          scale: number,
          forcedMode?: "globe" | "map",
        ) => {
          nativeZoomIntent.current.active = false;
          const nextMode =
            forcedMode ??
            projectionMode(
              scale - zoomOffset(),
              projection.current.mode,
              mapFillZoom(window.innerHeight) - zoomOffset(),
            );
          const nextZoom = toUiZoom(scale);
          nativeSync.current = {
            mode: nextMode,
            zoom: nextZoom,
            revision: latest.current.zoomRevision,
          };
          if (nextMode !== projection.current.mode) {
            const instant =
              keyboardIntent.current ||
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            animateProjection.current?.(nextMode, instant);
            instance.easeTo({
              zoom: cameraZoom(
                scale,
                instance.getCenter().lat,
                nextMode === "globe" ? 0 : 1,
              ),
              duration: instant ? 0 : projectionDuration * 1000,
              easing: (t) => 1 - (1 - t) ** 3,
            });
          }
          latest.current.onZoomChange(nextZoom, nextMode);
        };
        instance.touchZoomRotate.disableRotation();
        instance.keyboard.disable();
        const onMapKey = (event: KeyboardEvent) => {
          const directions: Record<string, [number, number]> = {
            ArrowLeft: [-100, 0],
            ArrowRight: [100, 0],
            ArrowUp: [0, -100],
            ArrowDown: [0, 100],
          };
          if (directions[event.key]) {
            event.preventDefault();
            nativeZoomIntent.current.active = false;
            // Omitting zoom lets the native globe helper preserve radius during latitude changes.
            instance.panBy(
              directions[event.key],
              { duration: 0 },
              { originalEvent: event },
            );
          } else if (isZoomInput(event)) {
            event.preventDefault();
            nativeZoomIntent.current.active = false;
            const direction = ["+", "="].includes(event.key) ? 1 : -1;
            if (
              isFlatFloorZoomOut(
                -direction,
                instance.getZoom(),
                projection.current.mix,
                projection.current.mode,
                mapFloor(),
              )
            )
              finishNativeZoom(zoomOffset(), "globe");
            else
              instance.zoomTo(
                instance.getZoom() + direction,
                { duration: 0 },
                { originalEvent: event },
              );
          }
        };
        instance.getCanvas().addEventListener("keydown", onMapKey);
        removeKeyboard = () =>
          instance.getCanvas().removeEventListener("keydown", onMapKey);
        map.current = instance;
        animateProjection.current = (nextMode, instant) => {
          projectionAnimation?.stop();
          projection.current.mode = nextMode;
          const target = nextMode === "globe" ? 0 : 1;
          const update = (mix: number) => {
            projection.current.mix = mix;
            instance.setGlobalStateProperty(projectionStateKey, mix);
          };
          if (instant || projection.current.mix === target) update(target);
          else
            projectionAnimation = animate(projection.current.mix, target, {
              duration: projectionDuration,
              ease: [0.22, 1, 0.36, 1],
              onUpdate: update,
            });
        };
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
          const next = markerLevel(
            instance.getZoom(),
            liveLevel.current,
            breakoutZoom.current,
          );
          if (next !== liveLevel.current) {
            liveLevel.current = next;
            setLevel(next);
            if (next === "country") breakoutZoom.current = toEngineZoom(3);
          }
        });
        instance.on("render", () => {
          if (container.current) {
            container.current.dataset.mapProjection = String(
              projection.current.mix,
            );
            container.current.dataset.mapMode = projection.current.mode;
            container.current.dataset.mapApparentZoom = String(
              apparentZoom(
                instance.getZoom(),
                instance.getCenter().lat,
                projection.current.mix,
              ),
            );
            container.current.dataset.mapRawZoom = String(instance.getZoom());
            container.current.dataset.mapLatitude = String(
              instance.getCenter().lat,
            );
          }
          if (!markerLayoutDirty.current) return;
          markerLayoutDirty.current = false;
          const moving = instance.isMoving();
          const instant =
            keyboardIntent.current ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const scale = window.matchMedia("(min-width: 701px)").matches
            ? desktopMarkerScale
            : 1;
          instance
            .getContainer()
            .style.setProperty("--marker-scale", String(scale));
          const canvas = instance.getCanvas();
          const width = canvas.clientWidth / scale;
          const height = canvas.clientHeight / scale;
          const anchors = [...markers.current].flatMap(
            ([id, { marker, node, exiting }]) => {
              if (exiting) return [];
              const element = marker.getElement();
              const point = instance.project(marker.getLngLat());
              if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
                return [];
              return [
                {
                  id,
                  x: point.x / scale,
                  y: point.y / scale,
                  visible: !element.classList.contains(
                    "maplibregl-marker-covered",
                  ),
                  priority:
                    latest.current.selectedNodeId === id ||
                    (!latest.current.selectedNodeId &&
                      latest.current.selected === node.collectionId) ||
                    element.contains(document.activeElement),
                },
              ];
            },
          );
          const priorIds = new Set(markerLayout.current.offsets.keys());
          markerLayout.current = layoutMapMarkers({
            anchors,
            viewport: { width, height },
            previous: markerLayout.current,
            moving,
          });
          const offsets = markerLayout.current.offsets;
          const visibleAnchors = anchors.filter(
            (anchor) =>
              anchor.visible &&
              anchor.x >= -54 &&
              anchor.x <= width + 54 &&
              anchor.y >= -54 &&
              anchor.y <= height + 54,
          );
          const widths = new Map(
            visibleAnchors.map(({ id }) => {
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
          const labels = markerLabels(visibleAnchors, offsets, widths);
          for (const [id, offset] of offsets) {
            const entry = markers.current.get(id)!;
            const element = entry.marker.getElement();
            element.dataset.layoutMotion = String(entry.placed && !instant);
            entry.placed = true;
            const x = offset.x * scale;
            const y = offset.y * scale;
            const key = `${x},${y}`;
            if (element.dataset.callout !== key) {
              element.style.setProperty("--callout-x", `${x}px`);
              element.style.setProperty("--callout-y", `${y}px`);
              element.dataset.callout = key;
            }
            const label = labels.get(id);
            if (label && (!moving || !priorIds.has(id))) {
              if (element.dataset.labelSide !== label.side)
                element.dataset.labelSide = label.side;
              if (element.dataset.labelHidden !== String(label.hidden))
                element.dataset.labelHidden = String(label.hidden);
            }
            const path = element.querySelector("path");
            const line = `M0 0L${x} ${y}`;
            if (path?.getAttribute("d") !== line) path?.setAttribute("d", line);
          }
          const viewport = instance.getCanvas().getBoundingClientRect();
          for (const { marker, exiting } of markers.current.values()) {
            const element = marker.getElement();
            const target =
              element.querySelector<HTMLElement>(".map-photo-marker");
            const visible = Boolean(
              target &&
              !exiting &&
              element.dataset.markerPhase === "active" &&
              markerTargetVisible(
                target.getBoundingClientRect(),
                viewport,
                element.classList.contains("maplibregl-marker-covered"),
              ),
            );
            if (element.inert === visible) element.inert = !visible;
            if (element.getAttribute("aria-hidden") !== String(!visible))
              element.setAttribute("aria-hidden", String(!visible));
          }
        });
        instance.on("moveend", () => {
          markerLayoutDirty.current = true;
          instance.triggerRepaint();
        });
        instance.on("dragstart", () => {
          gestureMoved.current = true;
          if (projection.current.mix > 0 && projection.current.mix < 1) {
            const settled = settleProjection(
              instance.getZoom(),
              instance.getCenter().lat,
              projection.current.mix,
            );
            animateProjection.current?.(settled.mode, true);
            // Reapply the new endpoint constraint without jumpTo, which stops active gesture handlers.
            instance.setTransformCameraUpdate((next) => ({
              zoom: cameraZoom(settled.scale, next.center.lat, settled.mix),
            }));
            try {
              instance.setTransformConstrain((center, rawZoom) => {
                const camera = constrainCamera(
                  center,
                  rawZoom,
                  projection.current.mix,
                  projection.current.mode,
                  zoomOffset(),
                  window.innerHeight,
                );
                return {
                  center: new LngLat(camera.longitude, camera.latitude),
                  zoom: camera.zoom,
                };
              });
            } finally {
              instance.setTransformCameraUpdate(null);
            }
            if (container.current) {
              const surface = container.current;
              surface.dataset.mapProjectionInterruptions = String(
                Number(surface.dataset.mapProjectionInterruptions ?? 0) + 1,
              );
              surface.dataset.mapProjectionInterruptionError = String(
                Math.abs(
                  apparentZoom(
                    instance.getZoom(),
                    instance.getCenter().lat,
                    settled.mix,
                  ) - settled.scale,
                ),
              );
            }
            const settledZoom = toUiZoom(settled.scale);
            nativeSync.current = {
              mode: settled.mode,
              zoom: settledZoom,
              revision: latest.current.zoomRevision,
            };
            latest.current.onZoomChange(settledZoom, settled.mode);
          }
        });
        instance.on("zoomstart", (event) => {
          if (event.originalEvent) gestureMoved.current = true;
          if (isZoomInput(event.originalEvent, instance.scrollZoom.isZooming()))
            nativeZoomIntent.current.active = true;
        });
        instance.on("zoom", (event) => {
          if (isZoomInput(event.originalEvent, instance.scrollZoom.isZooming()))
            nativeZoomIntent.current.active = true;
        });
        instance.on("zoomend", () => {
          if (!takeZoomIntent(nativeZoomIntent.current)) return;
          finishNativeZoom(
            Math.max(
              zoomOffset(),
              apparentZoom(
                instance.getZoom(),
                instance.getCenter().lat,
                projection.current.mix,
              ),
            ),
          );
        });
        instance.on("wheel", (event) => {
          if (
            !isFlatFloorZoomOut(
              event.originalEvent.deltaY,
              instance.getZoom(),
              projection.current.mix,
              projection.current.mode,
              mapFloor(),
            )
          )
            return;
          event.preventDefault();
          event.originalEvent.preventDefault();
          // HandlerManager stops the current camera after preventable wheel callbacks return.
          queueMicrotask(() => {
            if (
              cancelled ||
              map.current !== instance ||
              !isFlatFloorZoomOut(
                event.originalEvent.deltaY,
                instance.getZoom(),
                projection.current.mix,
                projection.current.mode,
                mapFloor(),
              )
            )
              return;
            finishNativeZoom(zoomOffset(), "globe");
          });
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
          markerLayoutDirty.current = true;
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
      projectionAnimation?.stop();
      removeKeyboard?.();
      animateProjection.current = null;
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("wheel", onPointer, true);
      resize?.disconnect();
      markerInstances.forEach(({ marker, exitTimer, enterFrame }) => {
        if (exitTimer !== undefined) window.clearTimeout(exitTimer);
        if (enterFrame !== undefined) cancelAnimationFrame(enterFrame);
        marker.remove();
      });
      markerInstances.clear();
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const Constructor = MarkerClass.current;
    if (!ready || !instance || !Constructor) return;
    const motion =
      markerMembershipSeen.current &&
      !keyboardIntent.current &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const previousEntries = [...markers.current.values()].map(
      ({ node, marker }) => ({
        countryId: node.countryId,
        kind: node.kind,
        coordinates: marker.getLngLat(),
      }),
    );
    const snapshot = () =>
      new Map(
        [...markers.current].map(([id, entry]) => [
          id,
          { element: entry.marker.getElement(), node: entry.node },
        ]),
      );
    const ids = new Set(nodes.map((node) => node.id));
    for (const [id, entry] of markers.current) {
      if (!ids.has(id) && !entry.exiting) {
        if (entry.enterFrame !== undefined)
          cancelAnimationFrame(entry.enterFrame);
        if (!motion) {
          entry.marker.remove();
          markers.current.delete(id);
          continue;
        }
        const element = entry.marker.getElement();
        element.inert = true;
        element.setAttribute("aria-hidden", "true");
        element.dataset.entryMotion = "true";
        element.dataset.markerPhase = "exiting";
        const exitTimer = window.setTimeout(() => {
          entry.marker.remove();
          markers.current.delete(id);
          setHosts(snapshot());
          markerLayoutDirty.current = true;
          instance.triggerRepaint();
        }, 120);
        markers.current.set(id, { ...entry, exiting: true, exitTimer });
      }
    }
    for (const node of nodes) {
      const existing = markers.current.get(node.id);
      if (existing) {
        if (existing.exitTimer !== undefined)
          window.clearTimeout(existing.exitTimer);
        markers.current.set(node.id, {
          ...existing,
          node,
          exitTimer: undefined,
          exiting: false,
        });
        existing.marker.getElement().dataset.markerPhase = "active";
        existing.marker.setLngLat(node.coordinates);
        continue;
      }
      const element = document.createElement("div");
      element.className = "map-thumbnail-host";
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
      element.style.setProperty("--callout-x", "0px");
      element.style.setProperty("--callout-y", "-28px");
      element.dataset.labelSide = "above";
      element.dataset.markerPhase = motion ? "entering" : "active";
      element.dataset.entryMotion = String(motion);
      element.dataset.layoutMotion = "false";
      const parent = previousEntries.find(
        (entry) =>
          entry.countryId === node.countryId && entry.kind !== node.kind,
      );
      if (motion && parent) {
        const origin = instance.project(parent.coordinates);
        const point = instance.project(node.coordinates);
        const distance = Math.hypot(origin.x - point.x, origin.y - point.y);
        if (Number.isFinite(distance) && distance > 0) {
          const scale = Math.min(12, distance) / distance;
          element.style.setProperty(
            "--marker-entry-x",
            `${(origin.x - point.x) * scale}px`,
          );
          element.style.setProperty(
            "--marker-entry-y",
            `${(origin.y - point.y) * scale}px`,
          );
        }
      }
      const marker = new Constructor({
        element,
        anchor: "center",
        subpixelPositioning: true,
        opacityWhenCovered: 0,
      })
        .setLngLat(node.coordinates)
        .addTo(instance);
      markers.current.set(node.id, { marker, node, placed: false });
    }
    markerMembershipSeen.current = true;
    markerLayoutDirty.current = true;
    setHosts(snapshot());
    instance.triggerRepaint();
  }, [nodes, ready]);

  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const color = colors();
    instance.setPaintProperty("water", "background-color", color.water);
    instance.setPaintProperty("land", "fill-color", color.land);
    instance.setPaintProperty("edge", "line-color", color.edge);
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
      nativeZoomIntent.current.active = false;
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
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const { width, height } = container.current.getBoundingClientRect();
    const finish = () => latest.current.onIntroEnd();
    const targetCenter =
      navigationTarget.current ??
      selectedNode?.coordinates ??
      selectedPlace?.coordinates;
    navigationTarget.current = null;
    // Zooming in heads for the selection, else the photographed place nearest the view's center.
    const middle = instance.project(instance.getCenter());
    const snapCenter =
      !recenter &&
      mode === "map" &&
      (previous.mode === "globe" || zoom > previous.zoom)
        ? (targetCenter ??
          latest.current.places
            .map((place) => place.coordinates)
            .sort(
              (a, b) =>
                instance.project(a).dist(middle) -
                instance.project(b).dist(middle),
            )[0])
        : undefined;
    const center = recenter ? targetCenter : snapCenter;
    const targetMix = mode === "globe" ? 0 : 1;
    const targetZoom = cameraZoom(
      toEngineZoom(mode === "globe" ? 0 : zoom),
      center ? center[1] : instance.getCenter().lat,
      targetMix,
    );
    if (
      !recenter &&
      Math.abs(instance.getZoom() - targetZoom) < 0.001 &&
      projection.current.mix === targetMix
    )
      return;
    const projectionChanged =
      projection.current.mode !== mode || projection.current.mix !== targetMix;
    const instant = reduced || keyboardIntent.current;
    nativeZoomIntent.current.active = false;
    instance.stop();
    animateProjection.current?.(mode, instant);
    const childBounds =
      recenter && mode === "map" && selectedNode?.kind === "country"
        ? getCountryChildBounds(selectedNode.countryId, latest.current.places)
        : null;
    const framed = childBounds
      ? instance.cameraForBounds(childBounds, {
          padding: {
            top: 72,
            left: 64,
            right: canvasOpen && width > 700 ? 430 : 64,
            bottom:
              canvasOpen && width <= 700
                ? Math.min(height * 0.5, Math.max(height * 0.25, 180)) + 40
                : 72,
          },
          maxZoom: toEngineZoom(3.5),
        })
      : undefined;
    if (framed?.zoom !== undefined)
      breakoutZoom.current = Math.min(toEngineZoom(3), framed.zoom - 0.2);
    const settle = () =>
      instance.easeTo({
        ...(framed ? { center: framed.center } : center ? { center } : {}),
        zoom: framed?.zoom ?? targetZoom,
        // Selection offsets frame the drawer without leaving projection-dependent padding behind.
        offset:
          !framed && center && canvasOpen
            ? width > 700
              ? [-205, 0]
              : [0, -height * 0.125]
            : [0, 0],
        duration: instant
          ? 0
          : projectionChanged
            ? projectionDuration * 1000
            : intro
              ? introSettleMs
              : 650,
        easing: (t) => 1 - (1 - t) ** 3,
      });
    if (!intro) {
      settle();
      return;
    }
    if (instant || !recenter) {
      instance.once("moveend", finish);
      settle();
      return () => instance.off("moveend", finish);
    }
    // Spin up (ease-in), then hand off at the same speed to the ease-out settle.
    let touched = false;
    const touch = () => {
      touched = true;
    };
    const userEvents = ["mousedown", "touchstart", "wheel"] as const;
    for (const type of userEvents) instance.once(type, touch);
    const afterSpin = () => {
      if (touched) return finish();
      instance.once("moveend", finish);
      settle();
    };
    const start = instance.getCenter();
    instance.once("moveend", afterSpin);
    instance.easeTo({
      center: [start.lng + introSpinDegrees, start.lat],
      duration: introSpinMs,
      easing: (t) => t * t,
    });
    return () => {
      for (const type of userEvents) instance.off(type, touch);
      instance.off("moveend", afterSpin);
      instance.off("moveend", finish);
    };
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
        nativeZoomIntent.current.active = false;
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
      {[...hosts.values()].map(({ element: host, node }) => {
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
            <div
              className="map-marker-callout"
              onTransitionEnd={(event) => {
                if (event.target !== event.currentTarget) return;
                markerLayoutDirty.current = true;
                map.current?.triggerRepaint();
              }}
            >
              <div
                className="map-marker-content"
                ref={(element) => {
                  if (!element) return;
                  markerLayoutDirty.current = true;
                  map.current?.triggerRepaint();
                  const entry = markers.current.get(node.id);
                  if (entry && host.dataset.markerPhase === "entering") {
                    if (entry.enterFrame !== undefined)
                      cancelAnimationFrame(entry.enterFrame);
                    // Commit the entrance style before the next animation frame.
                    void element.offsetWidth;
                    entry.enterFrame = requestAnimationFrame(() => {
                      const current = markers.current.get(node.id);
                      if (current && !current.exiting)
                        host.dataset.markerPhase = "active";
                      if (current) current.enterFrame = undefined;
                      markerLayoutDirty.current = true;
                      map.current?.triggerRepaint();
                    });
                  }
                }}
              >
                <Button
                  variant="quiet"
                  press={false}
                  className="map-photo-marker"
                  style={{
                    display: "block",
                    position: "absolute",
                    left: -24,
                    top: -24,
                    width: 48,
                    height: 48,
                    minHeight: 48,
                    padding: 2,
                    borderRadius: 12,
                  }}
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
                  onFocus={() => {
                    markerLayoutDirty.current = true;
                    map.current?.triggerRepaint();
                  }}
                  onClick={(event) => {
                    if (
                      markers.current.get(node.id)?.exiting ||
                      (event.detail !== 0 && gestureMoved.current)
                    )
                      return;
                    navigationTarget.current = node.coordinates;
                    if (props.onChooseNode) props.onChooseNode(node);
                    else props.onChoose(node.collectionId);
                    if (node.kind === "country")
                      props.onZoomChange(
                        Math.max(3.5, toUiZoom(map.current?.getZoom() ?? 0)),
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
              </div>
            </div>
          </>,
          host,
          node.id,
        );
      })}
      <span className="map-attribution">Natural Earth</span>
    </div>
  );
}
