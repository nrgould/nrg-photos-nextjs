import {
  geoDistance,
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
