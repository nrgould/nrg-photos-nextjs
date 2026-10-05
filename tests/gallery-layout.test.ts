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

test("two heroes share one row at one height, widths by aspect", () => {
  const tiles = galleryLayout([0.8, 1.5, 0.8, 0.8, 0.8], 358, { heroes: 2 });
  assert.equal(tiles[0].y, tiles[1].y);
  assert.equal(tiles[0].height, tiles[1].height);
  assert.equal(tiles[0].width + 8 + tiles[1].width, 358);
  assert.ok(tiles[1].width > tiles[0].width);
  assert.ok(tiles[2].y > tiles[0].y + tiles[0].height);
  assert.ok(!overlaps(tiles));
  const portraits = galleryLayout([0.5, 0.5], 358, { heroes: 2 });
  assert.equal(portraits[0].height, (350 / 2) * 1.25);
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

test("space left after the heroes pushes the grid down", () => {
  const plain = galleryLayout(Array(5).fill(0.8), 358, { heroes: 1 });
  const spaced = galleryLayout(Array(5).fill(0.8), 358, {
    heroes: 1,
    after: 120,
  });
  assert.equal(spaced[0].y, plain[0].y);
  assert.equal(spaced[1].y, plain[1].y + 120);
});

test("a landscape takes two cells of a grid row, and rows stay whole", () => {
  const cell = (358 - 16) / 3;
  // Hero, then portrait, landscape, landscape, portrait, portrait.
  const tiles = galleryLayout([0.8, 0.8, 1.5, 1.5, 0.8, 0.8], 358, {
    heroes: 1,
  });
  assert.equal(tiles.length, 6);
  const [, a, wide, wide2, b, c] = tiles;
  // Portrait + landscape fill a row; the second landscape pulls the next portrait up beside it.
  assert.equal(a.y, wide.y);
  assert.equal(wide.width, cell * 2 + 8);
  assert.equal(wide.height, a.height);
  assert.equal(wide2.y, b.y);
  assert.equal(wide2.x, 0);
  assert.equal(b.x, wide2.width + 8);
  assert.ok(c.y > b.y);
  assert.ok(!overlaps(tiles));
  // Five portraits then a landscape: the landscape joins the second row, a portrait moves on.
  const late = galleryLayout([0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 1.5], 358, {
    heroes: 1,
  });
  assert.equal(late[6].y, late[4].y);
  assert.equal(late[6].width, cell * 2 + 8);
  assert.ok(late[5].y > late[4].y);
  assert.ok(!overlaps(late));
  // A landscape with no portrait near enough to finish its row runs full width.
  const lone = galleryLayout([0.8, 1.5, 1.5, 1.5], 358, { heroes: 1 });
  assert.equal(lone[1].width, 358);
  assert.ok(!overlaps(lone));
  // Places keep two-column cards whatever the cover's shape.
  const cards = galleryLayout([1.5, 1.5, 0.8], 300, { columns: 2 });
  assert.equal(cards[0].width, cards[1].width);
});
