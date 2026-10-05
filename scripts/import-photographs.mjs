import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import {
  centroid,
  locationFields,
  manifestEntry,
  resolveLocation,
} from "./lib/photo-import.mjs";
// Portfolio originals: node --env-file=.env.local scripts/import-photographs.mjs
// Lightroom map export: node --env-file=.env.local scripts/import-photographs.mjs <map-photos.json> [--dry-run]
//   Rows missing from the bucket are encoded from their `input` file.
const bucket = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
).storage.from("photos");
const manifestPath = "src/lib/photo-manifest.json";
const treePath = "src/data/locations.json";
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
const writeJson = (file, value) =>
  fs.writeFile(file, JSON.stringify(value, null, 2) + "\n");

// sharp drops input metadata, GPS included; only a Lightroom copyright is written back.
async function encode(input, copyright) {
  let image = sharp(input).rotate().resize({
    width: 2400,
    height: 2400,
    fit: "inside",
    withoutEnlargement: true,
  });
  if (copyright) image = image.withExif({ IFD0: { Copyright: copyright } });
  const output = await image.webp({ quality: 88 }).toBuffer();
  const { width, height } = await sharp(output).metadata();
  return { output, width, height };
}

async function upload(src, file) {
  const { error } = await bucket.upload(path.basename(src), file, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed: ${src}: ${error.message}`);
}

async function rebuildOriginals() {
  for (const item of manifest) {
    if (item.lightroomId) continue;
    let input;
    if (item.origin.startsWith("Repository at ade778d: ")) {
      input = await fs.readFile(
        item.origin.replace("Repository at ade778d: ", ""),
      );
    } else if (item.origin.startsWith("Stills: ")) {
      if (!process.env.STILLS_DIR)
        throw new Error("Set STILLS_DIR to the Stills archive folder");
      input = await fs.readFile(
        path.join(process.env.STILLS_DIR, item.origin.replace("Stills: ", "")),
      );
    } else {
      const url = new URL(item.origin);
      if (url.origin !== "https://nicholasgouldphoto.com")
        throw new Error("Unexpected image origin");
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Image download failed: ${response.status} ${url}`);
      input = Buffer.from(await response.arrayBuffer());
    }
    const { output, width, height } = await encode(input);
    await upload(item.src, output);
    item.width = width;
    item.height = height;
  }
  await writeJson(manifestPath, manifest);
  console.log(`Rebuilt ${manifest.length} original photographs.`);
}

// OSM Nominatim policy: one request per second, identified client, results cached (in locations.json).
async function geocode(names) {
  await new Promise((resolve) => setTimeout(resolve, 1100));
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: [...names].reverse().join(", "),
    format: "jsonv2",
    limit: "1",
  });
  const response = await fetch(url, {
    headers: { "User-Agent": "nrg-photos-nextjs photo import" },
  });
  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
  const [hit] = await response.json();
  return hit && centroid([[Number(hit.lon), Number(hit.lat)]]);
}

async function importLightroom(exportPath, dryRun) {
  const rows = JSON.parse(await fs.readFile(exportPath, "utf8")).filter(
    (row) => row.status === "site" || row.status === "hero",
  );
  const tree = JSON.parse(await fs.readFile(treePath, "utf8"));
  const countryLabels = JSON.parse(
    await fs.readFile("src/data/country-labels.json", "utf8"),
  );
  const previous = new Map(manifest.map((entry) => [entry.src, entry]));
  const created = [];
  const unplaced = [];
  const placed = [];
  for (const row of rows) {
    const { names, error } = locationFields(row);
    // A pin is a City; without one the photo would sit on the country's "location unknown" reference.
    if (!(names?.length >= 3)) {
      unplaced.push(
        `${row.src} ${row.sourcePath} (${error ?? (names?.length ? "no City" : "no location")})`,
      );
      continue;
    }
    let locationId;
    try {
      locationId = resolveLocation(tree, names, countryLabels, created);
    } catch (problem) {
      unplaced.push(`${row.src} ${row.sourcePath} (${problem.message})`);
      continue;
    }
    const title = row.caption?.trim() || names.at(-1);
    placed.push({
      row,
      names,
      entry: manifestEntry(row, locationId, title, previous.get(row.src)),
    });
  }

  // Places (third level) need a pin: photo GPS first, else one geocode. Sublocations take GPS only.
  const byId = (id) => tree.find((node) => node.id === id);
  const ancestry = (id) => {
    const path = [];
    for (let node = byId(id); node; node = byId(node.parent))
      path.unshift(node);
    return path;
  };
  for (const node of created) {
    const path = ancestry(node.id);
    if (path.length < 3) continue;
    const gps = placed.flatMap(({ row, entry }) =>
      ancestry(entry.locationId).includes(node) &&
      Number.isFinite(row.lat) &&
      Number.isFinite(row.lon)
        ? [[row.lon, row.lat]]
        : [],
    );
    if (gps.length) {
      node.coordinates = centroid(gps);
      node.coordinateSource = "photo-gps";
    } else if (path.length === 3 && !dryRun) {
      const coordinates = await geocode(path.map((entry) => entry.name));
      if (coordinates) {
        node.coordinates = coordinates;
        node.coordinateSource = "geocoded";
      }
    }
  }

  const exported = new Set(placed.map(({ entry }) => entry.src));
  const dropped = manifest.filter(
    (entry) => entry.lightroomId && !exported.has(entry.src),
  );
  const next = [
    ...manifest.filter((entry) => !entry.lightroomId),
    ...placed.map(({ entry }) => entry),
  ];

  const { data: stored, error } = await bucket.list("", { limit: 10000 });
  if (error) throw new Error(`Bucket list failed: ${error.message}`);
  const names = new Set(stored.map((file) => file.name));
  const uploads = placed.filter(
    ({ entry }) => !names.has(path.basename(entry.src)),
  );
  if (!dryRun) {
    for (const { row, entry } of uploads) {
      const { output, width, height } = await encode(row.input, row.copyright);
      await upload(entry.src, output);
      Object.assign(entry, { width, height });
    }
    // A photo restored after a reject is still in the bucket but lost its size with its entry.
    for (const { row, entry } of placed)
      if (!entry.width) {
        const { width, height } = await encode(row.input, row.copyright);
        Object.assign(entry, { width, height });
      }
    await writeJson(treePath, tree);
    await writeJson(manifestPath, next);
  }

  const report = (label, lines) =>
    console.log(
      `\n${label}: ${lines.length}${lines.length ? "\n  " + lines.join("\n  ") : ""}`,
    );
  console.log(
    `${dryRun ? "Dry run. " : ""}Placed ${placed.length} of ${rows.length} photographs.`,
  );
  report(
    "New locations",
    created.map(
      (node) =>
        `${node.id} (${node.name})${node.coordinates ? ` ${node.coordinates.join(", ")} ${node.coordinateSource}` : ""}`,
    ),
  );
  report(
    "Places without a pin (set coordinates by hand)",
    created
      .filter((node) => !node.coordinates && ancestry(node.id).length === 3)
      .map((node) => node.id),
  );
  report(
    "Sibling-placed (review)",
    placed
      .filter(({ entry }) => entry.placeSource === "sibling")
      .map(({ entry, names }) => `${entry.src} → ${names.join(" / ")}`),
  );
  report("Unplaced (Nicholas)", unplaced);
  report(
    "Need alt text",
    next.filter((entry) => !entry.alt).map((entry) => entry.src),
  );
  report(
    "Uploaded",
    uploads.map(({ entry }) => entry.src),
  );
  report(
    "Dropped from the map",
    dropped.map((entry) => entry.src),
  );
}

const [exportPath] = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--"));
if (exportPath)
  await importLightroom(exportPath, process.argv.includes("--dry-run"));
else await rebuildOriginals();
