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
 * the rest in a three-column grid, `after` px below the heroes left free. Places (`columns` 2):
 * two-column cards.
 */
export function galleryLayout(
  aspects: number[],
  width: number,
  { heroes = 0, columns = 3, caption = 0, after = 0 } = {},
): GalleryTile[] {
  const tiles: GalleryTile[] = [];
  let y = 0;
  const row = (count: number, height: (tileWidth: number) => number) => {
    const tileWidth = (width - gap * (count - 1)) / count;
    const tileHeight = height(tileWidth);
    for (let column = 0; column < count; column++)
      tiles.push({
        x: column * (tileWidth + gap),
        y,
        width: tileWidth,
        height: tileHeight,
      });
    y += tileHeight + caption + gap;
  };
  if (heroes > 0)
    row(1, (tileWidth) => Math.min(tileWidth / aspects[0], tileWidth * 1.25));
  if (heroes > 1)
    row(heroes - 1, (tileWidth) =>
      heroes === 2
        ? Math.min(tileWidth / aspects[1], tileWidth * 1.25)
        : tileWidth * 1.25,
    );
  y += after;
  for (let index = tiles.length; index < aspects.length; index += columns)
    row(columns, (tileWidth) => tileWidth * 1.25);
  return tiles.slice(0, aspects.length);
}

/** 1-3 leading heroes: every photo when there are three or fewer, else the marked ones (at least one). */
export function heroCount(count: number, marked: number) {
  return count <= 3 ? count : Math.min(3, Math.max(1, marked));
}
