import fs from "node:fs/promises";
import path from "node:path";
// node scripts/import-presets.mjs [<preset library dir>]
// Copies the public fields of the kept lineup into src/data/presets.json.
// Reads <dir>/site-export/presets.json, <dir>/lineup.json and, once the pairs are signed off,
// <dir>/site-export/examples.json. Never copies file names or Lightroom ids. A preset's place
// is the map location its id names (grainau-1 -> grainau) unless lineup.json sets `location`.
const dir = path.resolve(
  process.argv[2] ??
    path.join(process.env.HOME, "Desktop/Nicholas-Gould-Presets"),
);
const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (fallback !== undefined && error.code === "ENOENT") return fallback;
    throw error;
  }
};
const library = await readJson(path.join(dir, "site-export/presets.json"));
const lineup = await readJson(path.join(dir, "lineup.json"), {});
const examples = await readJson(
  path.join(dir, "site-export/examples.json"),
  {},
);
const locationIds = new Set(
  (await readJson("src/data/locations.json")).map((node) => node.id),
);
const manifestSrcs = new Set(
  (await readJson("src/lib/photo-manifest.json")).map((entry) => entry.src),
);

// lineup.json carries keep and mood until the export folds them in.
const mood = (row) => row.mood ?? lineup[row.id]?.mood;
const kept = library.filter((row) => lineup[row.id]?.keep ?? Boolean(row.mood));
const moods = [...new Set(Object.keys(lineup).map((id) => lineup[id].mood))];
for (const row of kept) if (!moods.includes(mood(row))) moods.push(mood(row));
// Grouped by mood in lineup order; numbered in that order until the export carries numbers.
const order = (row) => {
  const index = Object.keys(lineup).indexOf(row.id);
  return moods.indexOf(mood(row)) * 1000 + (index < 0 ? 999 : index);
};
kept.sort((a, b) => order(a) - order(b));

const presets = kept.map((row, index) => {
  if (!mood(row)) throw new Error(`${row.id} has no mood`);
  const example = examples[row.id];
  const {
    name,
    also,
    location = row.id.replace(/-\d+$/, ""),
    showcase,
  } = lineup[row.id] ?? {};
  if (!locationIds.has(location))
    throw new Error(`${row.id} place ${location} is not a map location`);
  for (const src of showcase ?? [])
    if (!manifestSrcs.has(src))
      throw new Error(`${row.id} showcase ${src} is not a map photo`);
  return {
    id: row.id,
    number: row.number ?? index + 1,
    name: name ?? row.name,
    category: mood(row),
    ...(also && { also }),
    location,
    bestFor: row.usage.best_for,
    whatItDoes: row.usage.what_it_does,
    watchOut: row.usage.watch_out,
    ...(example?.before && {
      example: {
        before: example.before,
        after: example.after,
        width: example.width,
        height: example.height,
      },
    }),
    showcase: showcase ?? example?.showcase ?? [],
  };
});

await fs.writeFile(
  "src/data/presets.json",
  JSON.stringify(presets, null, 2) + "\n",
);
console.log(
  `${presets.length} presets, ${presets.filter((p) => p.example).length} with a before/after pair`,
);
