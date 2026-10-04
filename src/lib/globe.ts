import {
  geoDistance,
  geoMercator,
  geoGraticule10,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import land from "@/data/land.json";
const graticule = geoGraticule10();
export const initialView: [number, number] = [13.65, 30];
export function globeFrame(view: [number, number], points: [number, number][]) {
  const projection = geoOrthographic()
    .translate([280, 280])
    .scale(251)
    .rotate([-view[0], -view[1]])
    .precision(0.8);
  const path = geoPath(projection);
  return {
    land: path(land as GeoPermissibleObjects) ?? "",
    grid: path(graticule) ?? "",
    points: points.map((point) => {
      const projected = projection(point);
      return {
        // Keep SVG attributes identical across server and browser math engines.
        position: projected?.map((coordinate) => Number(coordinate.toFixed(3))),
        visible: geoDistance(view, point) < Math.PI / 2,
      };
    }),
  };
}
export function shortestTurn(current: number, destination: number) {
  return ((destination - current + 540) % 360) - 180;
}

export const zoomStops = [1, 2, 3, 5, 7, 10] as const;
export const zoomLabels = [
  "World",
  "Continent",
  "Region",
  "Area",
  "Near",
  "Local",
] as const;
const flatProjection = geoMercator()
  .translate([0, 0])
  .scale(125)
  .precision(0.8);
const flatPath = geoPath(flatProjection);
const flatLand = flatPath(land as GeoPermissibleObjects) ?? "";
const flatGrid = flatPath(graticule) ?? "";
export function flatFrame(
  center: [number, number],
  zoom: number,
  points: [number, number][],
  size: [number, number] = [840, 560],
  offset: [number, number] = [0, 0],
) {
  const origin = flatProjection([
    center[0],
    Math.max(-75, Math.min(75, center[1])),
  ])!;
  const x = size[0] / 2 + offset[0] - origin[0] * zoom;
  const y = size[1] / 2 + offset[1] - origin[1] * zoom;
  return {
    land: flatLand,
    grid: flatGrid,
    transform: `translate(${x},${y}) scale(${zoom})`,
    points: points.map((point) => {
      const projected = flatProjection(point)!;
      const position = [projected[0] * zoom + x, projected[1] * zoom + y];
      return {
        position,
        visible:
          position[0] >= 0 &&
          position[0] <= size[0] &&
          position[1] >= 0 &&
          position[1] <= size[1],
      };
    }),
  };
}
