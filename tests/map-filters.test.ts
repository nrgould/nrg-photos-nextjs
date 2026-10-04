import { test } from "node:test";
import assert from "node:assert/strict";
import { travelPlaces } from "../src/lib/places";
import {
  activeFilterCount,
  defaultMapFilters,
  filterPlaces,
  navigatePlaces,
  retainSelection,
  type MapFilters,
} from "../src/lib/map-filters";

const defaults = defaultMapFilters(travelPlaces);
const results = (filters: MapFilters) => {
  const places = filterPlaces(travelPlaces, filters);
  return [
    places.reduce((count, place) => count + place.photos.length, 0),
    places.length,
  ];
};

test("orientation and location combinations reflect the eleven original photo dimensions", () => {
  assert.deepEqual(results(defaults), [11, 4]);
  assert.deepEqual(results({ ...defaults, orientation: "horizontal" }), [3, 2]);
  assert.deepEqual(results({ ...defaults, orientation: "vertical" }), [8, 3]);
  assert.deepEqual(
    results({ locationIds: ["austria"], orientation: "vertical" }),
    [0, 0],
  );
  assert.deepEqual(
    results({ locationIds: ["norway"], orientation: "vertical" }),
    [3, 1],
  );
  assert.deepEqual(results({ ...defaults, locationIds: [] }), [0, 0]);
  assert.deepEqual(results(defaultMapFilters(travelPlaces)), [11, 4]);
});

test("matching photos preserve original identity and order without changing source collections", () => {
  const before = structuredClone(travelPlaces);
  const places = filterPlaces(travelPlaces, {
    ...defaults,
    orientation: "horizontal",
  });
  assert.deepEqual(
    places.map((place) => place.id),
    ["austria", "north-carolina"],
  );
  assert.equal(places[0], travelPlaces[0]);
  assert.deepEqual(
    places[1].photos.map((photo) => photo.title),
    ["A new chapter"],
  );
  assert.equal(places[1].photos[0], travelPlaces[3].photos[1]);
  assert.deepEqual(travelPlaces, before);
});

test("badge counts restrictive groups instead of photos or individual location choices", () => {
  assert.equal(activeFilterCount(travelPlaces, defaults), 0);
  assert.equal(
    activeFilterCount(travelPlaces, {
      ...defaults,
      locationIds: ["austria", "italy"],
    }),
    1,
  );
  assert.equal(
    activeFilterCount(travelPlaces, { ...defaults, orientation: "horizontal" }),
    1,
  );
  assert.equal(
    activeFilterCount(travelPlaces, {
      locationIds: [],
      orientation: "vertical",
    }),
    2,
  );
});

test("filtering retains a valid selection and clears an excluded location without choosing a replacement", () => {
  const places = filterPlaces(travelPlaces, {
    ...defaults,
    orientation: "horizontal",
  });
  assert.equal(retainSelection(places, "north-carolina"), "north-carolina");
  assert.equal(retainSelection(places, "italy"), null);
  assert.equal(retainSelection(places, null), null);
  assert.equal(retainSelection([], "austria"), null);
});

test("navigation wraps only eligible locations and handles no selection and empty results", () => {
  const places = filterPlaces(travelPlaces, {
    ...defaults,
    orientation: "horizontal",
  });
  assert.equal(navigatePlaces(places, "austria", "next"), "north-carolina");
  assert.equal(navigatePlaces(places, "austria", "back"), "north-carolina");
  assert.equal(navigatePlaces(places, "north-carolina", "next"), "austria");
  assert.equal(navigatePlaces(places, null, "next"), "austria");
  assert.equal(navigatePlaces(places, null, "back"), "north-carolina");
  assert.equal(navigatePlaces(places, null, "shuffle", 0.99), "north-carolina");
  assert.equal(
    navigatePlaces(places, "austria", "shuffle", 0),
    "north-carolina",
  );
  assert.equal(navigatePlaces([places[0]], "austria", "shuffle"), "austria");
  for (const direction of ["next", "back", "shuffle"] as const)
    assert.equal(navigatePlaces([], null, direction), null);
});
