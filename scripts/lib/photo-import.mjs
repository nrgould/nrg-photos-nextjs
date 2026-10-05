// Lightroom export rows → location tree nodes and manifest entries. Pure; the importer does I/O.

export const slug = (name) =>
  name
    .replace(/[æÆ]/g, "ae")
    .replace(/[øØ]/g, "o")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** IPTC Country, State/Province, City, Sublocation; a gap above a filled field is an error. */
export function locationFields(row) {
  const fields = [row.country, row.state, row.city, row.sublocation].map(
    (value) => value?.trim() || null,
  );
  const depth = fields.findLastIndex(Boolean) + 1;
  const missing = fields.slice(0, depth).findIndex((value) => !value);
  if (missing >= 0)
    return { error: `missing ${["Country", "State", "City"][missing]}` };
  return { names: fields.slice(0, depth) };
}

/** Finds each level by name under its parent, appending what is new to `tree` and `created`. */
export function resolveLocation(tree, names, countryLabels, created) {
  let parent;
  for (const name of names) {
    const same = (node) =>
      node.parent === parent?.id &&
      node.name.localeCompare(name, undefined, { sensitivity: "base" }) === 0;
    let node = tree.find(same);
    if (!node) {
      const base = slug(name);
      const ids = new Set(tree.map((entry) => entry.id));
      const id = !ids.has(base)
        ? base
        : parent && !ids.has(`${base}-${parent.id}`)
          ? `${base}-${parent.id}`
          : null;
      if (!id) throw new Error(`Location id collision: ${names.join(" / ")}`);
      node = parent ? { id, parent: parent.id, name } : { id, name };
      if (!parent) {
        const label = countryLabels.features.find(
          ({ properties }) =>
            properties.name === name || properties.name.startsWith(`${name} `),
        );
        if (!label) throw new Error(`Unknown country: ${name}`);
        node.naturalEarthId = label.properties.id;
      }
      tree.push(node);
      created.push(node);
    }
    parent = node;
  }
  return parent.id;
}

/** Rounded to two decimals: an area reference, never the camera position. */
export function centroid(points) {
  const round = (value) => Math.round(value * 100) / 100;
  return [
    round(points.reduce((sum, [lon]) => sum + lon, 0) / points.length),
    round(points.reduce((sum, [, lat]) => sum + lat, 0) / points.length),
  ];
}

export function manifestEntry(row, locationId, title, previous) {
  return {
    src: row.src,
    title,
    alt: row.altText?.trim() || previous?.alt || "",
    origin: `Lightroom ${row.lightroomId}`,
    width: row.width ?? previous?.width,
    height: row.height ?? previous?.height,
    // Full capture time: places order their photos by it; labels read only year and month.
    taken: row.capturedAt,
    locationId,
    ...(row.placeSource && { placeSource: row.placeSource }),
    lightroomId: row.lightroomId,
    ...(row.status === "hero" && { hero: true }),
    ...(row.status === "hero" && row.lead && { lead: true }),
    ...(row.presetId && { presetId: row.presetId }),
  };
}
