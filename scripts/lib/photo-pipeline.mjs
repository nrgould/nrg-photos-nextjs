import { createHash } from "node:crypto";
const taxonomy = new Set([
  "landscape",
  "portrait",
  "lifestyle",
  "product",
  "architecture",
  "water",
  "mountain",
  "forest",
  "urban",
  "snow",
]);
export function planBatches(manifest, batchSize = 100) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000)
    throw new Error("Batch size must be 1–1000");
  const seen = new Set();
  const jobs = manifest.map((photo) => {
    if (
      !/^\/photos\/[a-zA-Z0-9_.-]+\.webp$/.test(photo.src) ||
      seen.has(photo.src)
    )
      throw new Error("Invalid or duplicate photo identity");
    seen.add(photo.src);
    const key = photo.src.slice(1);
    return {
      id: createHash("sha256").update(key).digest("hex").slice(0, 24),
      photo: photo.src,
      classification: {
        provider: "jev",
        state: "unconfigured",
        input: "approved-derivative-only",
        tags: [],
        confidence: null,
        review: "pending",
      },
    };
  });
  return {
    version: 1,
    mode: "dry-run",
    networkRequests: 0,
    batches: Array.from(
      { length: Math.ceil(jobs.length / batchSize) },
      (_, i) => jobs.slice(i * batchSize, (i + 1) * batchSize),
    ),
  };
}
export function validateResults(rows, plan) {
  if (!Array.isArray(rows)) throw new Error("Expected result array");
  const expected = new Map(
    plan.batches.flat().map((job) => [job.id, job.photo]),
  );
  const seen = new Set();
  return rows.map((row) => {
    if (
      !row ||
      !expected.has(row.id) ||
      seen.has(row.id) ||
      expected.get(row.id) !== row.photo
    )
      throw new Error("Unknown, duplicate or mismatched result identity");
    if (
      !Array.isArray(row.tags) ||
      !row.tags.length ||
      row.tags.some((tag) => !taxonomy.has(tag))
    )
      throw new Error("Invalid classification tags");
    if (
      !Number.isFinite(row.confidence) ||
      row.confidence < 0 ||
      row.confidence > 1
    )
      throw new Error("Confidence must be 0–1");
    seen.add(row.id);
    return {
      id: row.id,
      photo: row.photo,
      tags: [...new Set(row.tags)],
      confidence: row.confidence,
      review: "pending",
      source: "jev-unverified",
    };
  });
}
