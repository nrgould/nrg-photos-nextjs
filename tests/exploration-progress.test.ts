import { test } from "node:test";
import assert from "node:assert/strict";
import { travelPlaces } from "../src/lib/places";
import { getMapNodes } from "../src/lib/map-hierarchy";
import {
  createExplorationProgress,
  explorationChallenges,
  explorationLocations,
  getExplorationSummary,
  mergeExplorationProgress,
  recordExplorationEvent,
  restoreExplorationProgress,
} from "../src/lib/exploration-progress";

const ids = explorationLocations.map((location) => location.id);
const boat = "/photos/landscape_sailboat_in_a_blizzard.webp";
const empty = createExplorationProgress();
const visit = (progress: unknown, locationId: string) =>
  recordExplorationEvent(progress, { type: "location-opened", locationId });

test("progress registry uses the nine verified regional leaves, never country aggregates", () => {
  assert.equal(ids.length, 9);
  assert.deepEqual(
    ids,
    getMapNodes(travelPlaces, "location")
      .filter((node) => node.precision === "regional")
      .map((node) => node.id),
  );
  assert.ok(
    ids.every((id) => id.startsWith("location:") && !id.includes("unlocated")),
  );
  assert.equal(getExplorationSummary(empty).availableLocationCount, 9);
});

test("five distinct verified location opens complete a local milestone without entitlement", () => {
  let progress = empty;
  for (const id of ids.slice(0, 4)) progress = visit(progress, id);
  assert.equal(getExplorationSummary(progress).milestoneComplete, false);
  progress = visit(progress, ids[4]);
  const summary = getExplorationSummary(progress);
  assert.equal(summary.visitedCount, 5);
  assert.equal(summary.requiredCount, 5);
  assert.equal(summary.milestoneComplete, true);
  assert.equal(summary.entitlement, "not-verified");
  assert.deepEqual(summary.completedChallengeIds, []);
  assert.deepEqual(empty, createExplorationProgress());
});

test("replayed visits, countries, unknown fallback leaves and collection IDs cannot inflate progress", () => {
  const once = visit(empty, ids[0]);
  let progress = once;
  for (const id of [
    ids[0],
    ids[0],
    "country:austria",
    "austria",
    "location:norway-unlocated",
    "location:invented",
    "__proto__",
  ])
    progress = visit(progress, id);
  assert.deepEqual(progress, once);
  assert.equal(getExplorationSummary(progress).visitedCount, 1);
});

test("red-boat completion requires the exact actual opened photograph; visits and hints do not complete it", () => {
  const actual = travelPlaces
    .flatMap((place) => place.photos)
    .find((photo) => photo.src === boat);
  assert.ok(actual);
  assert.equal(actual.title, "Into the Arctic");
  assert.match(actual.alt, /red boat/i);
  let progress = visit(empty, "location:tromso");
  progress = recordExplorationEvent(progress, {
    type: "hint-revealed",
    challengeId: "find-red-boat",
  });
  progress = recordExplorationEvent(progress, {
    type: "photo-opened",
    photoSrc: boat + "?fake",
  });
  progress = recordExplorationEvent(progress, {
    type: "photo-opened",
    photoSrc: "/photos/hallstatt-1.webp",
  });
  assert.deepEqual(getExplorationSummary(progress).completedChallengeIds, []);
  progress = recordExplorationEvent(progress, {
    type: "photo-opened",
    photoSrc: boat,
  });
  assert.deepEqual(getExplorationSummary(progress).completedChallengeIds, [
    "find-red-boat",
  ]);
  assert.deepEqual(
    recordExplorationEvent(progress, { type: "photo-opened", photoSrc: boat }),
    progress,
  );
  assert.equal(
    getExplorationSummary(
      recordExplorationEvent(empty, { type: "photo-opened", photoSrc: boat }),
    ).visitedCount,
    0,
  );
});

test("unverified dog challenge stays planned and cannot be completed or reveal a fabricated hint", () => {
  const dog = explorationChallenges.find(
    (challenge) => challenge.id === "find-the-dog",
  );
  assert.ok(dog);
  assert.equal(dog.status, "planned");
  assert.equal("photoSrc" in dog, false);
  const progress = recordExplorationEvent(empty, {
    type: "hint-revealed",
    challengeId: "find-the-dog",
  });
  assert.deepEqual(progress, empty);
});

test("storage accepts only versioned known IDs and derives completions instead of trusting claimed rewards", () => {
  const raw = JSON.stringify({
    version: 1,
    visitedLocationIds: [ids[0], ids[0], "country:italy", null],
    openedPhotoSrcs: [boat, boat, "/private"],
    revealedHintIds: ["find-red-boat", "invented"],
    completedChallengeIds: ["find-the-dog"],
    ownedPresetIds: ["signature-01"],
    rewardEntitlement: true,
  });
  const progress = restoreExplorationProgress(raw);
  assert.deepEqual(progress, {
    version: 1,
    visitedLocationIds: [ids[0]],
    openedPhotoSrcs: [boat],
    revealedHintIds: ["find-red-boat"],
  });
  assert.equal(getExplorationSummary(progress).entitlement, "not-verified");
  for (const bad of [
    null,
    "{",
    "null",
    "[]",
    "7",
    '{"version":2}',
    '{"version":1,"visitedLocationIds":{}}',
  ])
    assert.deepEqual(restoreExplorationProgress(bad), empty);
});

test("merges converge across browser tabs regardless of event order, without duplicates or mutation", () => {
  const a = visit(visit(empty, ids[3]), ids[0]);
  const b = recordExplorationEvent(visit(empty, ids[4]), {
    type: "photo-opened",
    photoSrc: boat,
  });
  const c = visit(empty, ids[1]);
  const snapshot = structuredClone(a);
  assert.deepEqual(
    mergeExplorationProgress(a, b),
    mergeExplorationProgress(b, a),
  );
  assert.deepEqual(mergeExplorationProgress(a, a), a);
  assert.deepEqual(
    mergeExplorationProgress(mergeExplorationProgress(a, b), c),
    mergeExplorationProgress(a, mergeExplorationProgress(b, c)),
  );
  assert.deepEqual(a, snapshot);
  assert.deepEqual(mergeExplorationProgress(a, null), a);
});

test("malformed and unrecognized events do not change progress or assert completion", () => {
  for (const event of [
    null,
    9,
    [],
    {},
    { type: "complete-challenge", id: "find-red-boat" },
    { type: "location-opened", locationId: 3 },
    { type: "photo-opened", photoSrc: {} },
    { type: "hint-revealed", challengeId: null },
  ])
    assert.deepEqual(recordExplorationEvent(empty, event), empty);
  assert.deepEqual(Object.keys(getExplorationSummary(empty)).sort(), [
    "availableLocationCount",
    "completedChallengeIds",
    "entitlement",
    "milestoneComplete",
    "requiredCount",
    "visitedCount",
  ]);
});
