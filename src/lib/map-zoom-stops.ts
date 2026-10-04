export const zoomLevels = [0, 1, 2, 3, 5, 10] as const;
export const zoomLabels = [
  "Globe",
  "World",
  "Continent",
  "Region",
  "Area",
  "Local",
] as const;

// Quantize only the control. Native map camera values remain continuous.
export function zoomStop(mode: "globe" | "map", zoom: number) {
  if (mode === "globe") return 0;
  if (!Number.isFinite(zoom) || zoom <= 1) return 1;
  if (zoom >= zoomLevels[5]) return 5;
  const upper = zoomLevels.findIndex(
    (value, index) => index > 0 && value >= zoom,
  );
  const fraction =
    Math.log(zoom / zoomLevels[upper - 1]) /
    Math.log(zoomLevels[upper] / zoomLevels[upper - 1]);
  return Math.round(upper - 1 + fraction);
}

export function zoomStopPosition(stop: number) {
  return `calc(${18 - (36 * stop) / 5}px + ${stop * 20}%)`;
}
