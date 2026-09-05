import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { collections, allPhotos, portrait } from "../src/lib/photography";
test("every portfolio photograph is original, local, described and dimensioned", () => {
  assert.equal(collections.length, 4);
  assert.equal(new Set(allPhotos.map((p) => p.src)).size, allPhotos.length);
  for (const p of [...allPhotos, portrait]) {
    assert.ok(p.src.startsWith("/photos/"));
    assert.ok(existsSync(`public${p.src}`), p.src);
    assert.ok(p.width > 0 && p.height > 0);
    assert.ok(p.alt.length > 20);
  }
});
