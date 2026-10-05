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
  locationTour,
  retainSelection,
  searchExplorer,
  shufflePlace,
  stepLocation,
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

test("shuffle picks another eligible place and handles no selection and empty results", () => {
  const places = filterPlaces(travelPlaces, {
    ...defaults,
    orientation: "horizontal",
  });
  const ids = places.map((place) => place.id);
  const [first, second] = ids;
  assert.ok(ids.length > 2 && !ids.includes(verticalOnly.id));
  assert.equal(shufflePlace(places, null, 0.99), ids.at(-1));
  assert.equal(shufflePlace(places, first, 0), second);
  assert.equal(shufflePlace([places[0]], first), first);
  assert.equal(shufflePlace([], null), null);
});

test("Previous and Next walk every location once, each step to a near neighbor", () => {
  const tour = locationTour(travelPlaces);
  const ids = tour.map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length);
  let id: string = ids[0];
  for (let i = 1; i <= ids.length; i++) {
    const next = stepLocation(travelPlaces, id, "next")!;
    assert.equal(next.id, ids[i % ids.length]);
    assert.equal(stepLocation(travelPlaces, next.id, "back")!.id, id);
    id = next.id;
  }
  // From Hallstatt, Next stays in the Alps rather than jumping a continent.
  const hallstatt = stepLocation(travelPlaces, "location:hallstatt", "next")!;
  const [lon, lat] = hallstatt.coordinates;
  assert.ok(Math.abs(lon - 13.65) < 5 && Math.abs(lat - 47.56) < 5);
  // A country enters at its first location; nothing selected starts at either end.
  assert.equal(
    stepLocation(travelPlaces, "norway", "next")!.collectionId,
    "norway",
  );
  assert.equal(stepLocation(travelPlaces, null, "next")!.id, tour[0].id);
  assert.equal(stepLocation(travelPlaces, null, "back")!.id, tour.at(-1)!.id);
  assert.equal(stepLocation([], null, "next"), null);
});

test("subject membership is explicitly grounded in every original map photo", () => {
  const photos = travelPlaces.flatMap((place) => place.photos);
  assert.equal(
    photos.filter((photo) => getPhotoSubject(photo.src) === "places").length,
    7,
  );
  const people = photos.filter(
    (photo) => getPhotoSubject(photo.src) === "people",
  );
  assert.deepEqual(people, []);
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
  assert.deepEqual(results({ ...defaults, subject: "places" }), [7, 4]);
  assert.deepEqual(results({ ...defaults, subject: "people" }), [0, 0]);
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
  assert.equal(retainSelection(people, "norway"), null);
});

test("facet counts predict the next choice while respecting the other filter", () => {
  const count = (keep: Keep) => expected(keep)[0];
  assert.deepEqual(mapFilterFacetCounts(travelPlaces, defaults), {
    subject: { all: total, places: 7, people: 0 },
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

test("search matches every word across places and photographs", () => {
  const empty = searchExplorer(travelPlaces, "");
  assert.equal(empty.photos.length, 0);
  assert.ok(empty.places.some(({ node }) => node.kind === "country"));

  const braies = searchExplorer(travelPlaces, "braies italy");
  assert.ok(braies.places.some(({ node }) => node.label === "Lago di Braies"));
  assert.ok(braies.photos.length > 0);
  assert.ok(braies.photos.length <= 20);
  for (const { node, collection } of braies.photos)
    assert.equal(`${node.label} ${collection}`.includes("Braies"), true);
  assert.equal(
    new Set(braies.photos.map(({ photo }) => photo.src)).size,
    braies.photos.length,
  );

  assert.deepEqual(searchExplorer(travelPlaces, "braies norway").places, []);
  assert.ok(
    searchExplorer(travelPlaces, "tromso").places.some(
      ({ node }) => node.label === "Tromsø",
    ),
  );

  // A region finds the places and photographs under it.
  const carolina = searchExplorer(travelPlaces, "north carolina");
  for (const label of ["Boone Fork Trail", "Cary", "Raleigh"])
    assert.ok(
      carolina.places.some(({ node }) => node.label === label),
      label,
    );
  assert.equal(carolina.photos.length, 20);
  assert.ok(new Set(carolina.photos.map(({ node }) => node.label)).size >= 3);
});
