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

test("four country aggregates and nine real locations each partition the eleven map photos", () => {
  const sourcePhotos = travelPlaces.flatMap((place) => place.photos);
  for (const [kind, count] of [
    ["country", 4],
    ["location", 9],
  ] as const) {
    const nodes = getMapNodes(travelPlaces, kind);
    assert.equal(nodes.length, count);
    assert.equal(new Set(nodes.map((node) => node.id)).size, count);
    const photos = nodes.flatMap((node) => node.photos);
    assert.equal(photos.length, 11);
    assert.equal(new Set(photos.map((photo) => photo.src)).size, 11);
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
});

test("country photo stacks center the eligible photographed regions while preserving identity", () => {
  const countries = getMapNodes(travelPlaces, "country");
  const leaves = getMapNodes(travelPlaces, "location");
  for (const [index, country] of countries.entries()) {
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
    assert.equal(country.collectionId, travelPlaces[index].id);
    assert.match(
      country.referenceLabel,
      /photographed-region cluster reference/,
    );
  }
  assert.deepEqual(
    getCountryChildBounds("country:united-states", travelPlaces),
    [
      [-81.89, 35.75],
      [-78.68, 35.78],
    ],
  );
  assert.deepEqual(countries[3].coordinates, [-80.285, 35.765]);
  assert.equal(countries[3].label, "United States");
  assert.equal(countries[3].collectionId, "united-states");
  assert.deepEqual(getCountryChildBounds("country:italy", travelPlaces), [
    [11.71, 46.59],
    [12.29, 46.7],
  ]);
  assert.equal(countries[1].coordinates[0], 12);
  assert.ok(Math.abs(countries[1].coordinates[1] - 46.645) < 1e-10);
});

test("single-child and filtered country anchors follow only remaining eligible photo locations", () => {
  assert.deepEqual(getCountryChildBounds("country:austria", travelPlaces), [
    [13.65, 47.56],
    [13.65, 47.56],
  ]);
  const horizontal = filterPlaces(travelPlaces, {
    ...defaultMapFilters(travelPlaces),
    orientation: "horizontal",
  });
  const country = getMapNode("country:united-states", horizontal);
  assert.deepEqual(country?.coordinates, [-78.68, 35.78]);
  assert.deepEqual(getCountryChildBounds("country:united-states", horizontal), [
    [-78.68, 35.78],
    [-78.68, 35.78],
  ]);
  assert.equal(country?.photoCount, 1);
  assert.equal(country?.cover.title, "A new chapter");
  assert.equal(getCountryChildBounds("country:italy", horizontal), null);
  assert.equal(getCountryChildBounds("country:united-states", []), null);
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
  const titles = (id: string) =>
    getMapNode(id, travelPlaces)?.photos.map((photo) => photo.title);
  assert.deepEqual(titles("location:braies"), ["Lago di Braies"]);
  assert.deepEqual(titles("location:seceda"), ["Seceda"]);
  assert.deepEqual(titles("location:santa-magdalena"), ["Santa Magdalena"]);
  assert.deepEqual(titles("location:cadini"), ["Cadini di Misurina"]);
  assert.deepEqual(titles("location:tromso"), ["Into the Arctic"]);
  assert.deepEqual(titles("location:lofoten"), [
    "Out in the elements",
    "Emily, Lofoten",
  ]);
  assert.deepEqual(titles("location:lake-james"), ["Lake James"]);
  assert.deepEqual(titles("location:raleigh"), ["A new chapter"]);
  const locations = getMapNodes(travelPlaces, "location");
  assert.ok(locations.every((node) => node.precision === "regional"));
  assert.equal(
    new Set(locations.map((node) => node.coordinates.join(","))).size,
    9,
  );
});

test("filtered hierarchy shares the real photo, location and country count matrix", () => {
  const defaults = defaultMapFilters(travelPlaces);
  for (const [orientation, photos, locations, countries] of [
    ["any", 11, 9, 4],
    ["horizontal", 3, 2, 2],
    ["vertical", 8, 7, 3],
  ] as const) {
    const places = filterPlaces(travelPlaces, { ...defaults, orientation });
    const leaves = getMapNodes(places, "location");
    assert.equal(leaves.length, locations);
    assert.equal(
      leaves.reduce((total, node) => total + node.photoCount, 0),
      photos,
    );
    assert.equal(getMapNodes(places, "country").length, countries);
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
  assert.equal(getMapNode("location:lake-james", horizontal), null);
  assert.equal(getMapNode("location:raleigh", horizontal)?.photoCount, 1);
  assert.equal(getMapNode("country:united-states", horizontal)?.photoCount, 1);
  assert.equal(getMapNode("location:seceda", horizontal), null);
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
  assert.deepEqual(
    lofoten?.photos.map((photo) => photo.src),
    renamed.photos.slice(0, 2).map((photo) => photo.src),
  );
  assert.equal(lofoten?.cover, renamed.photos[0]);
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
