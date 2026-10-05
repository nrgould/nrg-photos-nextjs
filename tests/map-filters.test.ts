import { test } from "node:test";
import assert from "node:assert/strict";
import { travelPlaces } from "../src/lib/places";
import type { Photo } from "../src/lib/photography";
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
type Keep = (photo: Photo) => boolean;
const horizontal: Keep = (photo) => photo.width > photo.height;
const vertical: Keep = (photo) => photo.height > photo.width;
const subject =
  (value: "places" | "people"): Keep =>
  (photo) =>
    getPhotoSubject(photo.src) === value;
const both =
  (a: Keep, b: Keep): Keep =>
  (photo) =>
    a(photo) && b(photo);
/** Photo and location counts read straight from the source collections. */
const expected = (keep: Keep, ids = defaults.locationIds) => {
  const counts = travelPlaces
    .filter((place) => ids.includes(place.id))
    .map((place) => place.photos.filter(keep).length);
  return [
    counts.reduce((total, count) => total + count, 0),
    counts.filter(Boolean).length,
  ];
};
const total = travelPlaces.reduce((sum, place) => sum + place.photos.length, 0);
const verticalOnly = travelPlaces.find((place) =>
  place.photos.every(vertical),
)!;

test("orientation and location combinations reflect the original photo dimensions", () => {
  assert.deepEqual(results(defaults), [total, travelPlaces.length]);
  const [wide] = expected(horizontal);
  const [tall] = expected(vertical);
  assert.ok(wide > 0 && tall > 0);
  assert.equal(wide + tall, total);
  assert.deepEqual(
    results({ ...defaults, orientation: "horizontal" }),
    expected(horizontal),
  );
  assert.deepEqual(
    results({ ...defaults, orientation: "vertical" }),
    expected(vertical),
  );
  assert.ok(verticalOnly);
  assert.deepEqual(
    results({ locationIds: [verticalOnly.id], orientation: "horizontal" }),
    [0, 0],
  );
  assert.deepEqual(
    results({ locationIds: ["norway"], orientation: "vertical" }),
    expected(vertical, ["norway"]),
  );
  assert.deepEqual(results({ ...defaults, locationIds: [] }), [0, 0]);
  assert.deepEqual(results(defaultMapFilters(travelPlaces)), [
    total,
    travelPlaces.length,
  ]);
});

test("matching photos preserve original identity and order without changing source collections", () => {
  const before = structuredClone(travelPlaces);
  for (const orientation of ["horizontal", "vertical"] as const) {
    const places = filterPlaces(travelPlaces, { ...defaults, orientation });
    const keep = orientation === "horizontal" ? horizontal : vertical;
    assert.deepEqual(
      places.map((place) => place.id),
      travelPlaces
        .filter((place) => place.photos.some(keep))
        .map((place) => place.id),
    );
    for (const place of places) {
      const source = travelPlaces.find((entry) => entry.id === place.id)!;
      if (source.photos.every(keep)) assert.equal(place, source);
      const kept = source.photos.filter(keep);
      assert.equal(place.photos.length, kept.length);
      place.photos.forEach((photo, index) => assert.equal(photo, kept[index]));
    }
  }
  assert.equal(
    filterPlaces(travelPlaces, { ...defaults, orientation: "vertical" }).find(
      (place) => place.id === verticalOnly.id,
    ),
    verticalOnly,
  );
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
  assert.equal(retainSelection(places, "united-states"), "united-states");
  assert.equal(retainSelection(places, verticalOnly.id), null);
  assert.equal(retainSelection(places, null), null);
  assert.equal(retainSelection([], "austria"), null);
});

test("navigation wraps only eligible locations and handles no selection and empty results", () => {
  const places = filterPlaces(travelPlaces, {
    ...defaults,
    orientation: "horizontal",
  });
  const ids = places.map((place) => place.id);
  const [first, second] = ids;
  const last = ids.at(-1)!;
  assert.ok(ids.length > 2 && !ids.includes(verticalOnly.id));
  const walk = [first];
  while (walk.length < ids.length)
    walk.push(navigatePlaces(places, walk.at(-1)!, "next")!);
  assert.deepEqual(walk, ids);
  assert.equal(navigatePlaces(places, last, "next"), first);
  assert.equal(navigatePlaces(places, first, "back"), last);
  assert.equal(navigatePlaces(places, null, "next"), first);
  assert.equal(navigatePlaces(places, null, "back"), last);
  assert.equal(navigatePlaces(places, null, "shuffle", 0.99), last);
  assert.equal(navigatePlaces(places, first, "shuffle", 0), second);
  assert.equal(navigatePlaces([places[0]], first, "shuffle"), first);
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
    ["Out in the elements", "Emily, Lofoten"],
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
  assert.deepEqual(results({ ...defaults, subject: "people" }), [2, 1]);
  for (const value of ["places", "people"] as const)
    for (const orientation of ["horizontal", "vertical"] as const)
      assert.deepEqual(
        results({ ...defaults, subject: value, orientation }),
        expected(
          both(
            subject(value),
            orientation === "horizontal" ? horizontal : vertical,
          ),
        ),
      );
  const people = filterPlaces(travelPlaces, { ...defaults, subject: "people" });
  for (const place of people) {
    const source = travelPlaces.find((entry) => entry.id === place.id)!;
    const kept = source.photos.filter(subject("people"));
    assert.equal(place.photos.length, kept.length);
    place.photos.forEach((photo, index) => assert.equal(photo, kept[index]));
  }
  assert.equal(retainSelection(people, "austria"), null);
  assert.equal(retainSelection(people, "norway"), "norway");
});

test("facet counts predict the next choice while respecting the other filter", () => {
  const count = (keep: Keep) => expected(keep)[0];
  assert.deepEqual(mapFilterFacetCounts(travelPlaces, defaults), {
    subject: { all: total, places: 8, people: 2 },
    orientation: {
      any: total,
      horizontal: count(horizontal),
      vertical: count(vertical),
    },
  });
  const people = subject("people");
  assert.deepEqual(
    mapFilterFacetCounts(travelPlaces, {
      ...defaults,
      subject: "people",
      orientation: "horizontal",
    }),
    {
      subject: {
        all: count(horizontal),
        places: count(both(subject("places"), horizontal)),
        people: count(both(people, horizontal)),
      },
      orientation: {
        any: count(people),
        horizontal: count(both(people, horizontal)),
        vertical: count(both(people, vertical)),
      },
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
    [total, travelPlaces.length],
  );
});
