import { test } from "node:test";
import assert from "node:assert/strict";
import { travelPlaces } from "../src/lib/places";
import { getMapNodes } from "../src/lib/map-hierarchy";
import {
  createExplorationProgress,
  explorationChallenges,
  explorationLocations,
  getExplorationSummary,
  describeExplorationProgress,
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

test("red-boat completion requires the exact actual opened photograph; visits do not complete it", () => {
  const actual = travelPlaces
    .flatMap((place) => place.photos)
    .find((photo) => photo.src === boat);
  assert.ok(actual);
  assert.equal(actual.title, "Into the Arctic");
  assert.match(actual.alt, /red boat/i);
  let progress = visit(empty, "location:tromso");
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

test("only challenges with a published photograph are listed", () => {
  assert.deepEqual(
    explorationChallenges.map((challenge) => challenge.id),
    ["find-red-boat"],
  );
});

test("each new place up to the goal and each found photo describe one toast", () => {
  let progress = empty;
  for (const [index, id] of ids.slice(0, 5).entries()) {
    const next = visit(progress, id);
    assert.deepEqual(describeExplorationProgress(progress, next), {
      kind: "location",
      label: explorationLocations[index].label,
      count: index + 1,
      goal: 5,
    });
    progress = next;
  }
  assert.equal(
    describeExplorationProgress(progress, visit(progress, ids[5])),
    null,
  );
  assert.equal(
    describeExplorationProgress(progress, visit(progress, ids[0])),
    null,
  );
  const found = recordExplorationEvent(progress, {
    type: "photo-opened",
    photoSrc: boat,
  });
  assert.deepEqual(describeExplorationProgress(progress, found), {
    kind: "challenge",
    title: "Find the red boat",
  });
});

test("storage accepts only versioned known IDs and derives completions instead of trusting claimed rewards", () => {
  const raw = JSON.stringify({
    version: 1,
    visitedLocationIds: [ids[0], ids[0], "country:italy", null],
    openedPhotoSrcs: [boat, boat, "/private"],
    revealedHintIds: ["find-red-boat"],
    completedChallengeIds: ["find-the-dog"],
    ownedPresetIds: ["signature-01"],
    rewardEntitlement: true,
  });
  const progress = restoreExplorationProgress(raw);
  assert.deepEqual(progress, {
    version: 1,
    visitedLocationIds: [ids[0]],
    openedPhotoSrcs: [boat],
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

test("malformed and unrecognized events do not change progress or assert completion", () => {
  for (const event of [
    null,
    9,
    [],
    {},
    { type: "complete-challenge", id: "find-red-boat" },
    { type: "location-opened", locationId: 3 },
    { type: "photo-opened", photoSrc: {} },
    { type: "hint-revealed", challengeId: "find-red-boat" },
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
