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

export const zoomStops = [1, 3, 9] as const;
export function flatFrame(
  center: [number, number],
  zoom: number,
  points: [number, number][],
  size: [number, number] = [840, 560],
) {
  const projection = geoMercator()
    .translate([size[0] / 2, size[1] / 2])
    .scale(125 * zoom)
    .center([center[0], Math.max(-75, Math.min(75, center[1]))])
    .clipExtent([
      [0, 0],
      [size[0], size[1]],
    ])
    .precision(0.8);
  const path = geoPath(projection);
  return {
    land: path(land as GeoPermissibleObjects) ?? "",
    grid: path(graticule) ?? "",
    points: points.map((point) => {
      const position = projection(point) ?? [0, 0];
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
