import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { geoGraticule10 } from "d3-geo";
import { prepareCountryContext } from "./lib/map-context.mjs";

function unwrapRing(ring) {
  const result = [ring[0].slice()];
  for (const [longitude, latitude] of ring.slice(1)) {
    const previous = result.at(-1)[0];
    let unwrapped = longitude;
    while (unwrapped - previous > 180) unwrapped -= 360;
    while (unwrapped - previous < -180) unwrapped += 360;
    result.push([unwrapped, latitude]);
  }
  const first = result[0];
  const last = result.at(-1);
  if (Math.abs(last[0] - first[0]) > 180) {
    // A ring winding around a pole closes through that pole on a flat map.
    const pole = result.every((point) => point[1] < 0)
      ? -90
      : result.every((point) => point[1] > 0)
        ? 90
        : null;
    if (pole === null)
      throw new Error("Cannot determine the pole for a winding land ring");
    result.push([last[0], pole]);
    const steps = Math.ceil(Math.abs(first[0] - last[0]) / 180);
    for (let step = 1; step <= steps; step++)
      result.push([last[0] + ((first[0] - last[0]) * step) / steps, pole]);
    result.push(first.slice());
  }
  return result;
}

function unwrapPolygon(polygon) {
  const exterior = unwrapRing(polygon[0]);
  const longitudes = exterior.map((point) => point[0]);
  const center = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
  const shift = 360 * Math.floor((center + 180) / 360);
  return [exterior, ...polygon.slice(1).map(unwrapRing)].map((ring, index) => {
    // Keep any holes in the same world copy as their exterior.
    const holeShift = index ? 360 * Math.round((center - ring[0][0]) / 360) : 0;
    return ring.map(([longitude, latitude]) => [
      longitude + holeShift - shift,
      latitude,
    ]);
  });
}

export function prepareLandForMercator(source) {
  return {
    ...source,
    features: source.features.map((feature) => {
      const geometry = feature.geometry;
      if (geometry.type !== "MultiPolygon" && geometry.type !== "Polygon")
        throw new Error(`Unsupported land geometry: ${geometry.type}`);
      return {
        ...feature,
        geometry: {
          ...geometry,
          coordinates:
            geometry.type === "Polygon"
              ? unwrapPolygon(geometry.coordinates)
              : geometry.coordinates.map(unwrapPolygon),
        },
      };
    }),
  };
}

async function prepareMapAssets() {
  await mkdir("public/maplibre", { recursive: true });
  await mkdir("public/maps", { recursive: true });
  for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"])
    await copyFile(
      `node_modules/maplibre-gl/dist/${file}`,
      `public/maplibre/${file}`,
    );
  await copyFile(
    "node_modules/maplibre-gl/LICENSE.txt",
    "public/maplibre/LICENSE.txt",
  );
  const topology = JSON.parse(
    await readFile("node_modules/world-atlas/countries-50m.json", "utf8"),
  );
  const context = prepareCountryContext(topology);
  await copyFile(
    "node_modules/world-atlas/LICENSE",
    "public/maps/world-atlas-LICENSE.txt",
  );
  await writeFile(
    "public/maps/land.json",
    JSON.stringify(prepareLandForMercator(context.land)),
  );
  await writeFile(
    "public/maps/boundaries.json",
    JSON.stringify(context.boundaries),
  );
  for (const name of ["country-labels", "city-labels"])
    await copyFile(`src/data/${name}.json`, `public/maps/${name}.json`);
  await writeFile("public/maps/grid.json", JSON.stringify(geoGraticule10()));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await prepareMapAssets();
