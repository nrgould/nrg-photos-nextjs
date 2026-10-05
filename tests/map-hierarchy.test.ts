import { test } from "node:test";
import assert from "node:assert/strict";
import countryLabels from "../src/data/country-labels.json";
import manifest from "../src/lib/photo-manifest.json";
import {
  locationPath,
  locations,
  photoLocations,
  travelPlaces,
} from "../src/lib/places";
import { defaultMapFilters, filterPlaces } from "../src/lib/map-filters";
import {
  getMapNode,
  getMapNodes,
  getCountryChildBounds,
  getCoordinateBounds,
} from "../src/lib/map-hierarchy";
import type { Photo } from "../src/lib/photography";

/** The pinned place (third tree level) a photo belongs to, read from the tree. */
const placeOf = (photo: Photo) => {
  const id = photoLocations.get(photo.src);
  const place = id ? locationPath(id)[2] : undefined;
  return place?.coordinates ? place : undefined;
};
/** Top-level map unit: the country, or the state inside the United States. */
const unitOf = (photo: Photo) => {
  const path = locationPath(photoLocations.get(photo.src)!);
  return path[0].id === "united-states" ? path[1].id : path[0].id;
};
const unitIds = (photos: Photo[]) => [
  ...new Set(photos.map((photo) => `country:${unitOf(photo)}`)),
];
const sourcePhotos = travelPlaces.flatMap((place) => place.photos);
const regionalIds = (photos: Photo[]) => [
  ...new Set(photos.flatMap((photo) => placeOf(photo)?.id ?? [])),
];

test("country aggregates and real locations each partition the map photos", () => {
  const unlocatedCountries = travelPlaces.filter((place) =>
    place.photos.some((photo) => !placeOf(photo)),
  ).length;
  for (const [kind, count] of [
    ["country", unitIds(sourcePhotos).length],
    ["location", regionalIds(sourcePhotos).length + unlocatedCountries],
  ] as const) {
    const nodes = getMapNodes(travelPlaces, kind);
    assert.equal(nodes.length, count);
    assert.equal(new Set(nodes.map((node) => node.id)).size, count);
    const photos = nodes.flatMap((node) => node.photos);
    assert.equal(photos.length, sourcePhotos.length);
    assert.equal(
      new Set(photos.map((photo) => photo.src)).size,
      sourcePhotos.length,
    );
    assert.deepEqual(
      photos.map((photo) => photo.src).sort(),
      sourcePhotos.map((photo) => photo.src).sort(),
    );
    for (const node of nodes) {
      assert.equal(node.photoCount, node.photos.length);
      assert.equal(node.cover, node.photos[0]);
      assert.ok(node.photos.every((photo) => sourcePhotos.includes(photo)));
      assert.ok(
        node.photos.every((photo) =>
          manifest.some((entry) => entry.src === photo.src),
        ),
      );
      assert.ok(node.coordinates.every(Number.isFinite));
      assert.ok(
        Math.abs(node.coordinates[0]) <= 180 &&
          Math.abs(node.coordinates[1]) <= 90,
      );
      assert.ok(node.referenceLabel.includes("reference"));
    }
  }
  assert.deepEqual(
    getMapNodes(travelPlaces, "country").map((node) => node.id),
    unitIds(sourcePhotos),
  );
});

test("the United States breaks out by state at the top level", () => {
  const countries = getMapNodes(travelPlaces, "country");
  const states = countries.filter(
    (node) => node.collectionId === "united-states",
  );
  assert.ok(states.length > 1);
  assert.ok(!countries.some((node) => node.id === "country:united-states"));
  assert.ok(states.some((node) => node.label === "North Carolina"));
  for (const state of states)
    assert.ok(
      state.photos.every((photo) => `country:${unitOf(photo)}` === state.id),
    );
  assert.equal(
    getCountryChildBounds("country:united-states", travelPlaces),
    null,
  );
  assert.equal(getCountryChildBounds("country:raleigh", travelPlaces), null);
});

test("country photo stacks center the eligible photographed regions while preserving identity", () => {
  const countries = getMapNodes(travelPlaces, "country");
  const leaves = getMapNodes(travelPlaces, "location");
  for (const country of countries) {
    const bounds = getCountryChildBounds(country.id, travelPlaces);
    assert.ok(bounds);
    const children = leaves.filter(
      (node) => node.countryId === country.id && node.precision === "regional",
    );
    for (const child of children) {
      assert.ok(
        child.coordinates[0] >= bounds[0][0] &&
          child.coordinates[0] <= bounds[1][0],
      );
      assert.ok(
        child.coordinates[1] >= bounds[0][1] &&
          child.coordinates[1] <= bounds[1][1],
      );
    }
    assert.equal(country.coordinates[0], (bounds[0][0] + bounds[1][0]) / 2);
    assert.equal(country.coordinates[1], (bounds[0][1] + bounds[1][1]) / 2);
    assert.equal(country.countryId, country.id);
    assert.equal(country.precision, "country");
    assert.equal(
      country.collectionId,
      locationPath(photoLocations.get(country.cover.src)!)[0].id,
    );
    assert.match(
      country.referenceLabel,
      /photographed-region cluster reference/,
    );
  }
  for (const country of countries)
    assert.deepEqual(
      getCountryChildBounds(country.id, travelPlaces),
      getCoordinateBounds(
        leaves
          .filter((node) => node.countryId === country.id)
          .map((node) => node.coordinates),
      ),
    );
  const northCarolina = countries.find(
    (node) => node.id === "country:north-carolina",
  )!;
  assert.equal(northCarolina.label, "North Carolina");
  assert.equal(northCarolina.collectionId, "united-states");
});

test("single-child and filtered country anchors follow only remaining eligible photo locations", () => {
  const unitedStates = travelPlaces.find(
    (place) => place.id === "united-states",
  )!;
  const raleigh = locations.find((node) => node.id === "raleigh")!.coordinates!;
  const onlyRaleigh = [
    {
      ...unitedStates,
      photos: unitedStates.photos.filter(
        (photo) => placeOf(photo)?.id === "raleigh",
      ),
    },
  ];
  assert.deepEqual(
    getCountryChildBounds("country:north-carolina", onlyRaleigh),
    [raleigh, raleigh],
  );
  assert.deepEqual(
    getMapNode("country:north-carolina", onlyRaleigh)?.coordinates,
    raleigh,
  );
  const horizontal = filterPlaces(travelPlaces, {
    ...defaultMapFilters(travelPlaces),
    orientation: "horizontal",
  });
  const inCarolina = (photo: Photo) => unitOf(photo) === "north-carolina";
  const wide = horizontal.find((place) => place.id === "united-states")!;
  const wideCarolina = wide.photos.filter(inCarolina);
  assert.ok(
    wideCarolina.length < unitedStates.photos.filter(inCarolina).length,
  );
  const bounds = getCountryChildBounds("country:north-carolina", horizontal);
  assert.deepEqual(
    bounds,
    getCoordinateBounds(
      wideCarolina.map((photo) => placeOf(photo)!.coordinates!),
    ),
  );
  const country = getMapNode("country:north-carolina", horizontal);
  assert.deepEqual(country?.coordinates, [
    (bounds![0][0] + bounds![1][0]) / 2,
    (bounds![0][1] + bounds![1][1]) / 2,
  ]);
  assert.equal(country?.photoCount, wideCarolina.length);
  assert.equal(country?.cover, wideCarolina[0]);
  const verticalOnly = travelPlaces.filter(
    (place) =>
      place.id !== "united-states" &&
      !horizontal.some((entry) => entry.id === place.id),
  );
  assert.ok(verticalOnly.length);
  for (const place of verticalOnly)
    assert.equal(
      getCountryChildBounds(`country:${place.id}`, horizontal),
      null,
    );
  assert.equal(getCountryChildBounds("country:north-carolina", []), null);
  assert.equal(getCountryChildBounds("united-states", travelPlaces), null);
  assert.equal(getCountryChildBounds("country:invented", travelPlaces), null);
});

test("wrapped child bounds use the small dateline extent instead of almost the whole world", () => {
  assert.deepEqual(
    getCoordinateBounds([
      [179, 10],
      [-179, 12],
      [178, 11],
    ]),
    [
      [178, 10],
      [181, 12],
    ],
  );
  assert.deepEqual(
    getCoordinateBounds([
      [-179, 12],
      [178, 11],
      [179, 10],
    ]),
    [
      [178, 10],
      [181, 12],
    ],
  );
  assert.deepEqual(
    getCoordinateBounds([
      [181, 5],
      [-179, 5],
    ]),
    [
      [-179, 5],
      [-179, 5],
    ],
  );
  assert.deepEqual(
    getCoordinateBounds([
      [180, 1],
      [-180, 2],
    ]),
    [
      [-180, 1],
      [-180, 2],
    ],
  );
  assert.equal(getCoordinateBounds([]), null);
});

test("unknown future photos retain country reference without inflating verified child bounds", () => {
  const norway = travelPlaces.find((place) => place.id === "norway")!;
  const unknown = { ...norway.photos[0], src: "/photos/new-unlocated.webp" };
  const reference = countryLabels.features.find(
    (entry) => entry.properties.id === "NOR",
  )!.geometry.coordinates;
  const onlyUnknown = [{ ...norway, photos: [unknown] }];
  assert.equal(getCountryChildBounds("country:norway", onlyUnknown), null);
  assert.deepEqual(
    getMapNode("country:norway", onlyUnknown)?.coordinates,
    reference,
  );
  assert.match(
    getMapNode("country:norway", onlyUnknown)!.referenceLabel,
    /no verified photo locations/,
  );
  assert.deepEqual(
    getMapNode("location:norway-unlocated", onlyUnknown)?.coordinates,
    reference,
  );
  const mixed = [{ ...norway, photos: [norway.photos[0], unknown] }];
  assert.deepEqual(getCountryChildBounds("country:norway", mixed), [
    [18.96, 69.65],
    [18.96, 69.65],
  ]);
  assert.deepEqual(
    getMapNode("country:norway", mixed)?.coordinates,
    [18.96, 69.65],
  );
  assert.equal(getMapNode("country:norway", mixed)?.photoCount, 2);
  assert.match(
    getMapNode("country:norway", mixed)!.referenceLabel,
    /unknown photo locations excluded/,
  );
  assert.equal(
    getMapNode("location:norway-unlocated", mixed)?.precision,
    "unknown",
  );
});

test("regional memberships distinguish the Dolomites, Tromsø, Lofoten and Raleigh", () => {
  for (const [id, src] of [
    ["braies", "/photos/3_landscape_lago_di_braies.webp"],
    ["seceda", "/photos/landscape_dolomites_seceda.webp"],
    ["santa-magdalena", "/photos/landscape_dolomites_santa_magdalena.webp"],
    ["cadini", "/photos/landscape_dolomites_cadini_di_misurina.webp"],
    ["tromso", "/photos/landscape_sailboat_in_a_blizzard.webp"],
    [
      "lofoten",
      "/photos/4_lifestyle_product_aileen_wearing_helly_hansen_jacket_lofoten_islands_norway.webp",
    ],
    [
      "lofoten",
      "/photos/lifestyle_portrait_emily_wearing_satila_beanie_lofoten_islands_norway.webp",
    ],
    ["lake-james", "/photos/landscape_lake_james.webp"],
    ["raleigh", "/photos/portrait_ncsu_grad_photo_4.webp"],
  ])
    assert.ok(
      getMapNode(`location:${id}`, travelPlaces)?.photos.some(
        (photo) => photo.src === src,
      ),
      `${src} in ${id}`,
    );
  const nodes = getMapNodes(travelPlaces, "location");
  for (const node of nodes)
    assert.deepEqual(
      node.photos,
      travelPlaces
        .find((place) => place.id === node.collectionId)!
        .photos.filter((photo) => `location:${placeOf(photo)?.id}` === node.id),
    );
  assert.ok(nodes.every((node) => node.precision === "regional"));
  assert.equal(
    new Set(nodes.map((node) => node.coordinates.join(","))).size,
    nodes.length,
  );
});

test("filtered hierarchy shares the real photo, location and country count matrix", () => {
  const defaults = defaultMapFilters(travelPlaces);
  for (const orientation of ["any", "horizontal", "vertical"] as const) {
    const places = filterPlaces(travelPlaces, { ...defaults, orientation });
    const photos = places.flatMap((place) => place.photos);
    const leaves = getMapNodes(places, "location");
    assert.equal(leaves.length, regionalIds(photos).length);
    assert.equal(
      leaves.reduce((total, node) => total + node.photoCount, 0),
      photos.length,
    );
    assert.equal(getMapNodes(places, "country").length, unitIds(photos).length);
    if (orientation === "any") assert.equal(photos.length, sourcePhotos.length);
    else assert.ok(photos.length < sourcePhotos.length);
  }
  const none = filterPlaces(travelPlaces, { ...defaults, locationIds: [] });
  assert.deepEqual(getMapNodes(none, "country"), []);
  assert.deepEqual(getMapNodes(none, "location"), []);
});

test("lookup clears a filtered-out leaf even when its collection remains eligible", () => {
  const horizontal = filterPlaces(travelPlaces, {
    ...defaultMapFilters(travelPlaces),
    orientation: "horizontal",
  });
  const isWide = (photo: Photo) => photo.width > photo.height;
  const leaves = getMapNodes(travelPlaces, "location").filter((node) =>
    horizontal.some((place) => place.id === node.collectionId),
  );
  const cleared = leaves.filter((node) => !node.photos.some(isWide));
  const kept = leaves.filter((node) => node.photos.some(isWide));
  assert.ok(cleared.length && kept.length);
  for (const node of cleared)
    assert.equal(getMapNode(node.id, horizontal), null);
  for (const node of kept)
    assert.equal(
      getMapNode(node.id, horizontal)?.photoCount,
      node.photos.filter(isWide).length,
    );
  assert.equal(
    getMapNode("country:north-carolina", horizontal)?.photoCount,
    horizontal
      .find((place) => place.id === "united-states")!
      .photos.filter((photo) => unitOf(photo) === "north-carolina").length,
  );
  assert.equal(getMapNode(null, horizontal), null);
  assert.equal(getMapNode("missing", travelPlaces), null);
});

test("membership depends on source identity, preserves input order, and never invents a location for new photos", () => {
  const before = structuredClone(travelPlaces);
  const norway = travelPlaces.find((place) => place.id === "norway")!;
  const renamed = {
    ...norway,
    photos: norway.photos
      .map((photo) => ({ ...photo, title: "Renamed" }))
      .reverse(),
  };
  const lofoten = getMapNode("location:lofoten", [renamed]);
  const expected = renamed.photos.filter(
    (photo) => placeOf(photo)?.id === "lofoten",
  );
  assert.ok(expected.length > 1);
  assert.deepEqual(lofoten?.photos, expected);
  assert.equal(lofoten?.cover, expected[0]);
  const newPhoto = { ...norway.photos[0], src: "/photos/new-unlocated.webp" };
  const future = getMapNodes([{ ...norway, photos: [newPhoto] }], "location");
  assert.equal(future.length, 1);
  assert.equal(future[0].id, "location:norway-unlocated");
  assert.equal(future[0].precision, "unknown");
  assert.equal(future[0].cover, newPhoto);
  assert.match(future[0].referenceLabel, /location unknown/);
  assert.deepEqual(travelPlaces, before);
});

test("the location tree is whole: unique ids, real parents, every place a photo sits in is pinned", () => {
  const ids = locations.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const node of locations) {
    if (node.parent) assert.ok(ids.includes(node.parent), node.id);
    else assert.ok(node.naturalEarthId, node.id);
    assert.ok(locationPath(node.id).length <= 4, node.id);
  }
  for (const [src, id] of photoLocations) {
    const place = locationPath(id)[2];
    if (place) assert.ok(place.coordinates?.every(Number.isFinite), src);
  }
});
