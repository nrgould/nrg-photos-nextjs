export type GalleryTile = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const gap = 8;

/**
 * Expanded drawer tiles, image boxes only (a caption sits below each when `caption` > 0).
 * Photos: the leading heroes large (the first full width, the next two side by side), then
 * the rest in a three-column grid where a landscape takes two cells, `after` px below the heroes
 * left free. Places (`columns` 2): two-column cards.
 */
export function galleryLayout(
  aspects: number[],
  width: number,
  { heroes = 0, columns = 3, caption = 0, after = 0 } = {},
): GalleryTile[] {
  const tiles: GalleryTile[] = [];
  let y = 0;
  const row = (
    indices: number[],
    count: number,
    height: (tileWidth: number) => number,
  ) => {
    const tileWidth = (width - gap * (count - 1)) / count;
    const tileHeight = height(tileWidth);
    indices.forEach((index, column) => {
      tiles[index] = {
        x: column * (tileWidth + gap),
        y,
        width: tileWidth,
        height: tileHeight,
      };
    });
    y += tileHeight + caption + gap;
  };
  const first = Math.min(heroes, aspects.length);
  if (first > 0)
    row([0], 1, (tileWidth) =>
      Math.min(tileWidth / aspects[0], tileWidth * 1.25),
    );
  if (first > 1)
    row([1, 2].slice(0, first - 1), heroes - 1, (tileWidth) =>
      heroes === 2
        ? Math.min(tileWidth / aspects[1], tileWidth * 1.25)
        : tileWidth * 1.25,
    );
  y += after;
  // Photo grids give a landscape two cells of a row. A row it can't finish takes the next
  // photo that fits, so rows stay whole; a landscape left alone runs full width instead.
  const queue = aspects.map((_, index) => index).slice(first);
  const span = (index: number) => (wideSpan(aspects, index, columns) ? 2 : 1);
  while (queue.length) {
    const cells: number[] = [];
    let used = 0;
    for (let look = 0; look < queue.length && look < 4 && used < columns;) {
      if (used + span(queue[look]) > columns) look++;
      else {
        used += span(queue[look]);
        cells.push(...queue.splice(look, 1));
      }
    }
    // Two portraits and a landscape that can't join: the landscape takes the second
    // portrait's place, which starts the next row.
    const wide = queue.slice(0, 4).findIndex((index) => span(index) === 2);
    if (used === columns - 1 && wide >= 0 && span(cells.at(-1)!) === 1) {
      queue.unshift(cells.pop()!);
      cells.push(...queue.splice(wide + 1, 1));
      used = columns;
    }
    if (used < columns && cells.length === 1 && span(cells[0]) === 2) {
      row(cells, 1, (tileWidth) => tileWidth / aspects[cells[0]]);
      continue;
    }
    const cellWidth = (width - gap * (columns - 1)) / columns;
    let x = 0;
    for (const index of cells) {
      const cellSpan = span(index);
      tiles[index] = {
        x,
        y,
        width: cellWidth * cellSpan + gap * (cellSpan - 1),
        height: cellWidth * 1.25,
      };
      x += tiles[index].width + gap;
    }
    y += cellWidth * 1.25 + caption + gap;
  }
  return tiles;
}

/** A grid photo that takes two cells: a landscape in a three-column photo grid. */
export function wideSpan(aspects: number[], index: number, columns = 3) {
  return columns === 3 && aspects[index] > 1;
}

/** 1-3 leading heroes: every photo when there are three or fewer, else the marked ones (at least one). */
export function heroCount(count: number, marked: number) {
  return count <= 3 ? count : Math.min(3, Math.max(1, marked));
}
