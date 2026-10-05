import { test } from "node:test";
import assert from "node:assert/strict";
import { galleryLayout, heroCount } from "../src/lib/gallery-layout";

const overlaps = (tiles: ReturnType<typeof galleryLayout>) =>
  tiles.some((a, i) =>
    tiles.some(
      (b, j) =>
        i < j &&
        a.x < b.x + b.width &&
        b.x < a.x + a.width &&
        a.y < b.y + b.height &&
        b.y < a.y + a.height,
    ),
  );

test("heroes lead large, the rest fill three columns without overlap", () => {
  const tiles = galleryLayout(Array(10).fill(0.8), 358, { heroes: 3 });
  assert.equal(tiles.length, 10);
  assert.equal(tiles[0].width, 358);
  assert.equal(tiles[1].y, tiles[2].y);
  assert.ok(tiles[1].width > tiles[3].width);
  assert.equal(new Set(tiles.slice(3).map((tile) => tile.x)).size, 3);
  assert.ok(!overlaps(tiles));
});

test("a wide hero keeps its aspect; places use captioned two-column cards", () => {
  assert.equal(galleryLayout([1.5], 300, { heroes: 1 })[0].height, 200);
  const cards = galleryLayout(Array(5).fill(1), 300, {
    columns: 2,
    caption: 38,
  });
  assert.equal(new Set(cards.map((tile) => tile.x)).size, 2);
  assert.equal(cards[2].y - cards[0].y, cards[0].height + 38 + 8);
  assert.ok(!overlaps(cards));
});

test("hero count: all of a small set, else the marked ones, one to three", () => {
  assert.equal(heroCount(2, 0), 2);
  assert.equal(heroCount(20, 0), 1);
  assert.equal(heroCount(20, 2), 2);
  assert.equal(heroCount(20, 5), 3);
});
