import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planBatches,
  validateResults,
} from "../scripts/lib/photo-pipeline.mjs";
const manifest = [{ src: "/photos/one.webp" }, { src: "/photos/two.webp" }];
test("dataset plans are idempotent, bounded and never transmit images", () => {
  const plan = planBatches(manifest, 1);
  assert.equal(plan.networkRequests, 0);
  assert.equal(plan.batches.length, 2);
  assert.deepEqual(plan, planBatches(manifest, 1));
  assert.throws(() => planBatches(manifest, 0));
  assert.throws(() => planBatches([manifest[0], manifest[0]]));
  assert.throws(() => planBatches([{ src: "/photos/../../secret.webp" }]));
});
test("classification imports preserve identity, validate taxonomy, and require human review", () => {
  const plan = planBatches(manifest);
  const job = plan.batches[0][0];
  const row = {
    id: job.id,
    photo: job.photo,
    tags: ["landscape"],
    confidence: 0.9,
  };
  assert.equal(validateResults([row], plan)[0].review, "pending");
  assert.throws(() => validateResults([{ ...row, confidence: 2 }], plan));
  assert.throws(() =>
    validateResults([{ ...row, photo: "/photos/two.webp" }], plan),
  );
  assert.throws(() =>
    validateResults([{ ...row, tags: ["verified-location"] }], plan),
  );
  assert.throws(() => validateResults([row, row], plan));
});
