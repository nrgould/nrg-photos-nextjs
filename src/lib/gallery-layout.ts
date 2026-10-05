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
 * the rest in a three-column grid with landscapes full width, `after` px below the heroes left
 * free. Places (`columns` 2): two-column cards.
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
  // Photo grids run a landscape full width at its own aspect, at the next row break,
  // so the portrait rows stay whole and the grid isn't one repeating cell.
  let cells: number[] = [];
  let wide: number[] = [];
  const flush = (all: boolean) => {
    if (cells.length === columns || (all && cells.length))
      row(cells, columns, (tileWidth) => tileWidth * 1.25);
    if (cells.length === columns || all || !cells.length) {
      cells = [];
      for (const index of wide)
        row([index], 1, (tileWidth) => tileWidth / aspects[index]);
      wide = [];
    }
  };
  for (let index = first; index < aspects.length; index++) {
    (columns === 3 && aspects[index] > 1 ? wide : cells).push(index);
    flush(false);
  }
  flush(true);
  return tiles;
}

/** 1-3 leading heroes: every photo when there are three or fewer, else the marked ones (at least one). */
export function heroCount(count: number, marked: number) {
  return count <= 3 ? count : Math.min(3, Math.max(1, marked));
}
