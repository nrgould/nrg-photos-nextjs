import { getMapNodes } from "../../map-hierarchy";
import { travelPlaces } from "../../places";
import { getCatalogPreset, presetCategories } from "../../preset-commerce";
import { CommerceError } from "./types";

const applicationOrigin = "https://photography.invalid";
const locationIds = new Set(
  [
    ...getMapNodes(travelPlaces, "country"),
    ...getMapNodes(travelPlaces, "location"),
  ].map((node) => node.id),
);
const hasControls = (value: string) =>
  [...value].some(
    (character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  );

export function normalizeCommerceReturnPath(
  value: unknown = "/",
): string {
  const invalid = () => new CommerceError("invalid_return_path");
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    hasControls(value) ||
    value.includes("#")
  )
    throw invalid();
  const rawPath = value.split("?", 1)[0];
  if (rawPath !== "/") throw invalid();
  let url: URL;
  try {
    url = new URL(value, applicationOrigin);
  } catch {
    throw invalid();
  }
  if (url.origin !== applicationOrigin || url.pathname !== rawPath)
    throw invalid();
  const keys = new Set<string>();
  for (const [key, parameter] of url.searchParams) {
    if (keys.has(key) || hasControls(parameter)) throw invalid();
    keys.add(key);
    if (key === "location") {
      if (!locationIds.has(parameter))
        throw invalid();
    } else if (key === "view") {
      if (parameter !== "catalog" && parameter !== "cart") throw invalid();
    } else if (key === "query") {
      if (parameter.length > 200) throw invalid();
    } else if (key === "category") {
      if (!presetCategories.some((category) => category === parameter))
        throw invalid();
    } else if (key === "preset") {
      if (!getCatalogPreset(parameter)) throw invalid();
    } else throw invalid();
  }
  url.searchParams.sort();
  return `${url.pathname}${url.search}`;
}

export function checkoutReturnUrl(
  origin: string,
  returnPath: unknown,
  outcome: "returned" | "cancelled",
) {
  const url = new URL(normalizeCommerceReturnPath(returnPath), origin);
  url.searchParams.set("checkout", outcome);
  return url.toString();
}
