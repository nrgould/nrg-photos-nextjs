# Photo import and JEV classification boundary

Photographs are public WebP derivatives in the Supabase Storage bucket `photos`, keyed by the basename of `src`. `src/lib/photo-manifest.json` records each one's provenance, size, alt text and, for map photos, `locationId`.

## Import from Lightroom

Location and alt text are tagged in Lightroom Classic (IPTC Country, State/Province, City, Sublocation and Alt Text; GPS from the Map module or a GPX tracklog). The export strips location from the files and writes it to the export JSON instead. Then:

1. `node --env-file=.env.local scripts/import-photographs.mjs <map-photos.json> --dry-run` and read the report.
2. Fix labels it rejects in Lightroom, not in this repo, and re-export. A photo needs at least a City to be placed; one tagged only to Country or State is reported unplaced.
3. Run without `--dry-run`. It matches each IPTC path to `src/data/locations.json` by name, adds new nodes, pins new places from photo GPS or one Nominatim lookup, encodes and uploads photos missing from the bucket from each row's `input` file (2400px WebP, metadata stripped except copyright) and rewrites the manifest.
4. Fill Lightroom Alt Text for every entry the report lists and re-import (the manifest keeps an existing alt when Lightroom's is empty). Review the diff, commit, check the preview.

Removal marks: on a preview deployment (or local dev), "Mark for removal" in the lightbox records the photo's `src` in the `photo_removals` table (`/api/curate`). Marks are a request list, not a filter: read them with `select src from photo_removals`, reject those photos in Lightroom and re-export. A mark whose photo has left the manifest is no longer returned.

Without an argument the script rebuilds the portfolio originals from their recorded origins.

## Classification (dry run)

No image is sent to a classifier. Run `node scripts/plan-photo-pipeline.mjs > /tmp/photo-jobs.json` for a deterministic manifest-only JEV batch plan. `PHOTO_BATCH_SIZE=100` controls chunks (1–1000). Stable photo IDs make reruns idempotent. This does not upload anything. Paths are validated against local derivative filenames; do not feed filesystem originals or credentials to it.

Run `node scripts/plan-photo-pipeline.mjs /path/to/results.json` to validate candidate classifier output. Each row needs an existing `id`, matching `photo`, nonempty taxonomy `tags`, and `confidence` between 0 and 1. Duplicate/unknown IDs, path mismatches and unknown tags fail closed. Imported results always remain `pending` review. Suggested taxonomy: landscape, portrait, lifestyle, product, architecture, water, mountain, forest, urban, snow. Confidence does not establish geographic or edit provenance.

## Proposed JEV integration

JEV is an unconfigured adapter boundary: first confirm the actual image-capable endpoint, supported input format, batch limits, retention policy and cost. Run a small labeled evaluation, measure precision/recall against human tags, choose abstention thresholds, then scale through bounded batches with backoff/checkpointing. Do not infer preset usage from image appearance. Import verified XMP/edit associations separately and require Nicholas's approval before changing public content.

Production blockers: JEV API contract and credentials, authorized image set, approved private preset delivery, edit provenance and pricing/licensing. The dry-run plan and validator are working; JEV inference, checkout and entitlement are intentionally unconnected.
