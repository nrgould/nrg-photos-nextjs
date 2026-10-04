import { readFile } from "node:fs/promises";
import { planBatches, validateResults } from "./lib/photo-pipeline.mjs";
const manifest = JSON.parse(
  await readFile(
    new URL("../src/lib/photo-manifest.json", import.meta.url),
    "utf8",
  ),
);
const plan = planBatches(manifest, Number(process.env.PHOTO_BATCH_SIZE || 100));
const resultFile = process.argv[2];
console.log(
  JSON.stringify(
    resultFile
      ? validateResults(JSON.parse(await readFile(resultFile, "utf8")), plan)
      : plan,
    null,
    2,
  ),
);
