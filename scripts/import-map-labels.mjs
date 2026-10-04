import { readFile, writeFile } from "node:fs/promises";
import { prepareMapLabels } from "./lib/map-context.mjs";

const [countriesPath, citiesPath] = process.argv.slice(2);
if (!countriesPath || !citiesPath)
  throw new Error(
    "Usage: node scripts/import-map-labels.mjs countries.geojson cities.geojson",
  );
const countries = JSON.parse(await readFile(countriesPath, "utf8"));
const cities = JSON.parse(await readFile(citiesPath, "utf8"));
const labels = prepareMapLabels(countries, cities);
await writeFile(
  "src/data/country-labels.json",
  JSON.stringify(labels.countries),
);
await writeFile("src/data/city-labels.json", JSON.stringify(labels.cities));
