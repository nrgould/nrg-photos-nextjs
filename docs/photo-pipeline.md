# Storage and JEV classification boundary

The prototype serves Nicholas's existing WebP derivatives locally. No service has been provisioned and no image is sent to a classifier.

Run `node scripts/plan-photo-pipeline.mjs > /tmp/photo-jobs.json` for a deterministic manifest-only R2/JEV batch plan. `PHOTO_BATCH_SIZE=100` controls chunks (1–1000). Stable photo IDs make reruns idempotent. This does not upload anything. Paths are validated against local derivative filenames; do not feed filesystem originals or credentials to it.

Run `node scripts/plan-photo-pipeline.mjs /path/to/results.json` to validate candidate classifier output. Each row needs an existing `id`, matching `photo`, nonempty taxonomy `tags`, and `confidence` between 0 and 1. Duplicate/unknown IDs, path mismatches and unknown tags fail closed. Imported results always remain `pending` review. Suggested taxonomy: landscape, portrait, lifestyle, product, architecture, water, mountain, forest, urban, snow. Confidence does not establish geographic or edit provenance.

## Proposed live integration

Use an existing, approved S3-compatible R2 bucket with separate public approved derivatives and private originals/preset files. Cache versioned derivatives; keep originals private. Generate short-lived signed preset downloads only after a verified purchase. Keep bucket credentials server-only. No Supabase storage. R2 is a candidate, not a quote or purchased resource; validate current pricing and expected storage/egress before provisioning.

JEV is an unconfigured adapter boundary: first confirm the actual image-capable endpoint, supported input format, batch limits, retention policy and cost. Run a small labeled evaluation, measure precision/recall against human tags, choose abstention thresholds, then scale through bounded batches with backoff/checkpointing. Do not infer preset usage from image appearance. Import verified XMP/edit associations separately and require Nicholas's approval before changing public content.

Production blockers: provisioned storage/access, JEV API contract and credentials, authorized image set, approved private preset delivery, edit provenance and pricing/licensing. The dry-run plan and validator are working; live uploads, JEV inference, checkout and entitlement are intentionally unconnected.
