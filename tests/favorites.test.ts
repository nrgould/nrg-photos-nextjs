import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nodeForPhoto,
  restoreFavorites,
  toggleFavorite,
} from "../src/lib/favorites";
import { travelPlaces } from "../src/lib/places";

const photo = travelPlaces[0].photos[0].src;
const empty = restoreFavorites(null);

test("toggle adds newest first and removes on second toggle", () => {
  const one = toggleFavorite(empty, "photoSrcs", photo);
  assert.deepEqual(one.photoSrcs, [photo]);
  assert.deepEqual(toggleFavorite(one, "photoSrcs", photo), empty);
  assert.equal(toggleFavorite(empty, "placeIds", "invented"), empty);
});

test("restore drops unknown, duplicate and malformed entries", () => {
  assert.deepEqual(
    restoreFavorites(
      JSON.stringify({
        placeIds: [3, "nope"],
        photoSrcs: [photo, photo, "/x"],
      }),
    ),
    { placeIds: [], photoSrcs: [photo] },
  );
  for (const bad of ["{", "null", "[]", "7"])
    assert.deepEqual(restoreFavorites(bad), empty);
});

test("every photograph resolves to a map leaf that contains it", () => {
  for (const place of travelPlaces)
    for (const { src } of place.photos)
      assert.ok(nodeForPhoto(src)?.photos.some((p) => p.src === src));
});
