import { test } from "node:test";
import assert from "node:assert/strict";
import { travelPlaces } from "../src/lib/places";
import {
  activeFilterCount,
  defaultMapFilters,
  filterPlaces,
  getPhotoSubject,
  mapFilterFacetCounts,
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

test("subject membership is explicitly grounded in every original map photo", () => {
  const photos = travelPlaces.flatMap((place) => place.photos);
  assert.equal(
    photos.filter((photo) => getPhotoSubject(photo.src) === "places").length,
    8,
  );
  const people = photos.filter(
    (photo) => getPhotoSubject(photo.src) === "people",
  );
  assert.deepEqual(
    people.map((photo) => photo.title),
    ["Out in the elements", "Emily, Lofoten", "A new chapter"],
  );
  assert.equal(getPhotoSubject("/photos/unreviewed.webp"), undefined);
  const unreviewed = [
    {
      ...travelPlaces[0],
      photos: [{ ...photos[0], src: "/photos/unreviewed.webp" }],
    },
  ];
  assert.equal(filterPlaces(unreviewed, defaults).length, 1);
  assert.equal(
    filterPlaces(unreviewed, { ...defaults, subject: "places" }).length,
    0,
  );
  assert.equal(
    filterPlaces(unreviewed, { ...defaults, subject: "people" }).length,
    0,
  );
});

test("subject and format intersect without changing original identity or order", () => {
  assert.deepEqual(results({ ...defaults, subject: "places" }), [8, 4]);
  assert.deepEqual(results({ ...defaults, subject: "people" }), [3, 2]);
  assert.deepEqual(
    results({ ...defaults, subject: "places", orientation: "horizontal" }),
    [2, 1],
  );
  assert.deepEqual(
    results({ ...defaults, subject: "places", orientation: "vertical" }),
    [6, 3],
  );
  assert.deepEqual(
    results({ ...defaults, subject: "people", orientation: "horizontal" }),
    [1, 1],
  );
  assert.deepEqual(
    results({ ...defaults, subject: "people", orientation: "vertical" }),
    [2, 1],
  );
  const people = filterPlaces(travelPlaces, { ...defaults, subject: "people" });
  assert.equal(people[0].photos[0], travelPlaces[2].photos[1]);
  assert.equal(people[1].photos[0], travelPlaces[3].photos[1]);
  assert.equal(retainSelection(people, "austria"), null);
  assert.equal(retainSelection(people, "norway"), "norway");
});

test("facet counts predict the next choice while respecting the other filter", () => {
  assert.deepEqual(mapFilterFacetCounts(travelPlaces, defaults), {
    subject: { all: 11, places: 8, people: 3 },
    orientation: { any: 11, horizontal: 3, vertical: 8 },
  });
  assert.deepEqual(
    mapFilterFacetCounts(travelPlaces, {
      ...defaults,
      subject: "people",
      orientation: "horizontal",
    }),
    {
      subject: { all: 3, places: 2, people: 1 },
      orientation: { any: 3, horizontal: 1, vertical: 2 },
    },
  );
  assert.equal(
    activeFilterCount(travelPlaces, { ...defaults, subject: "people" }),
    1,
  );
  assert.equal(
    activeFilterCount(travelPlaces, {
      ...defaults,
      subject: "people",
      orientation: "vertical",
    }),
    2,
  );
  assert.equal(
    activeFilterCount(travelPlaces, defaultMapFilters(travelPlaces)),
    0,
  );
  assert.deepEqual(
    results({ locationIds: defaults.locationIds, orientation: "any" }),
    [11, 4],
  );
});
