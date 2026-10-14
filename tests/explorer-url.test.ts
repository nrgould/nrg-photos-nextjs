import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readExplorerParams,
  writeExplorerParams,
} from "../src/lib/explorer-url";
import { nodeForPhoto } from "../src/lib/favorites";
import { presetCatalog } from "../src/lib/preset-commerce";
import { travelPlaces } from "../src/lib/places";

const photo = travelPlaces[0].photos[0].src;
const location = nodeForPhoto(photo)!.id;
const read = (params: URLSearchParams) =>
  readExplorerParams(Object.fromEntries(params));

test("a place with its open photo survives a reload", () => {
  const state = read(
    writeExplorerParams({
      location,
      page: "photos",
      presetId: null,
      category: "All",
      photo,
    }),
  );
  assert.equal(state.initialLocationId, location);
  assert.equal(state.initialPhoto, photo);
  assert.equal(state.initialView, undefined);
});

test("an open preset reopens in the catalog with its filter", () => {
  const preset = presetCatalog[0];
  const params = writeExplorerParams({
    location: null,
    page: "preset",
    presetId: preset.id,
    category: preset.category,
    photo: null,
  });
  const state = read(params);
  assert.equal(state.initialView, "catalog");
  assert.equal(state.initialCatalogState.selectedPresetId, preset.id);
  assert.equal(state.initialCatalogState.category, preset.category);
  // The list page keeps the filter but not a preset left selected under it.
  assert.equal(
    writeExplorerParams({
      location: null,
      page: "presets",
      presetId: preset.id,
      category: "All",
      photo: null,
    }).toString(),
    "view=catalog",
  );
});

test("every drawer page round-trips; the photo drawer and closed drawer write nothing", () => {
  for (const page of [
    "cart",
    "contact",
    "library",
    "saved",
    "challenges",
    "menu",
  ])
    assert.equal(
      read(
        writeExplorerParams({
          location: null,
          page,
          presetId: null,
          category: "All",
          photo: null,
        }),
      ).initialView,
      page,
    );
  for (const page of ["photos", null])
    assert.equal(
      writeExplorerParams({
        location: null,
        page,
        presetId: null,
        category: "All",
        photo,
      }).toString(),
      "",
    );
});

test("unknown places, views and photos from another place are dropped", () => {
  const elsewhere = travelPlaces
    .flatMap((place) => place.photos)
    .find(({ src }) => nodeForPhoto(src)?.id !== location)!.src;
  const state = readExplorerParams({
    location,
    photo: elsewhere,
    view: "admin",
  });
  assert.equal(state.initialPhoto, undefined);
  assert.equal(state.initialView, undefined);
  assert.equal(
    readExplorerParams({ location: "nowhere", photo }).initialLocationId,
    undefined,
  );
  assert.equal(
    readExplorerParams({ location: [location] }).initialLocationId,
    undefined,
  );
});
