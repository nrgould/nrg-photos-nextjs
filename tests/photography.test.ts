import { test } from "node:test";
import assert from "node:assert/strict";
import manifest from "../src/lib/photo-manifest.json";
import {
  collections,
  allPhotos,
  portrait,
  photoUrl,
} from "../src/lib/photography";
test("every portfolio photograph is original, in the manifest, described and dimensioned", () => {
  assert.equal(collections.length, 4);
  assert.equal(new Set(allPhotos.map((p) => p.src)).size, allPhotos.length);
  for (const p of [...allPhotos, portrait]) {
    assert.ok(p.src.startsWith("/photos/"));
    // The manifest names each upload to the photos bucket and its provenance.
    assert.ok(manifest.find((m) => m.src === p.src)?.origin, p.src);
    assert.ok(p.width > 0 && p.height > 0);
    assert.ok(p.alt.length > 20);
  }
});

test("a thumbnail lives under thumbs/ in the same bucket, keyed by the photo's basename", () => {
  assert.match(
    photoUrl("/photos/x.webp", true),
    /\/public\/photos\/thumbs\/x\.webp$/,
  );
  assert.match(photoUrl("/photos/x.webp"), /\/public\/photos\/x\.webp$/);
});
