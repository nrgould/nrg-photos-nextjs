import { test } from "node:test";
import assert from "node:assert/strict";
import countryLabels from "../src/data/country-labels.json";
import manifest from "../src/lib/photo-manifest.json";
import { travelPlaces } from "../src/lib/places";
import { defaultMapFilters, filterPlaces } from "../src/lib/map-filters";
import { getMapNode, getMapNodes } from "../src/lib/map-hierarchy";

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

test("country pins use Natural Earth country label references while keeping legacy collection IDs", () => {
  const nodes = getMapNodes(travelPlaces, "country");
  for (const [i, code] of ["AUT", "ITA", "NOR", "USA"].entries()) {
    const source = countryLabels.features.find(
      (entry) => entry.properties.id === code,
    );
    assert.ok(source);
    assert.deepEqual(nodes[i].coordinates, source.geometry.coordinates);
    assert.equal(nodes[i].countryId, nodes[i].id);
    assert.equal(nodes[i].precision, "country");
    assert.equal(nodes[i].collectionId, travelPlaces[i].id);
  }
  assert.equal(nodes[3].label, "United States");
  assert.equal(nodes[3].collectionId, "north-carolina");
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
