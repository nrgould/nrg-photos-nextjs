import { getMapNodes } from "./map-hierarchy";
import { travelPlaces } from "./places";

export const EXPLORATION_LOCATION_GOAL = 5;
export const EXPLORATION_STORAGE_KEY = "photography-exploration-progress-v1";

export const explorationLocations = getMapNodes(travelPlaces, "location")
  .filter((node) => node.precision === "regional")
  .map(({ id, label, photoCount }) => ({ id, label, photoCount }));

const locationIds = explorationLocations.map((location) => location.id);
const photoSrcs = [
  ...new Set(
    travelPlaces.flatMap((place) => place.photos.map((photo) => photo.src)),
  ),
];

export const explorationChallenges = [
  {
    id: "find-red-boat",
    title: "Find the red boat",
    status: "available" as const,
    clue: "A small flash of red, surrounded by Arctic water and snow.",
    hint: "Look through the photographs around Tromsø, Norway.",
    photoSrc: "/photos/landscape_sailboat_in_a_blizzard.webp",
    photoTitle: "Into the Arctic",
  },
  {
    id: "find-the-dog",
    title: "Find the dog",
    status: "planned" as const,
    clue: "A little companion, somewhere along the way.",
    unavailableReason:
      "Coming later. The photograph for this challenge has not been confirmed yet.",
  },
] as const;
const availableChallenges = explorationChallenges.filter(
  (challenge) => challenge.status === "available",
);
const challengeIds = availableChallenges.map((challenge) => challenge.id);

export type ExplorationProgress = {
  version: 1;
  visitedLocationIds: string[];
  openedPhotoSrcs: string[];
  revealedHintIds: string[];
};
export type ExplorationEvent =
  | { type: "location-opened"; locationId: string }
  | { type: "photo-opened"; photoSrc: string }
  | { type: "hint-revealed"; challengeId: string };

function knownIds(value: unknown, known: readonly string[]): string[] {
  const requested = new Set(
    Array.isArray(value) ? value.filter((id) => typeof id === "string") : [],
  );
  return known.filter((id) => requested.has(id));
}

export function createExplorationProgress(
  input: unknown = null,
): ExplorationProgress {
  const record =
    input &&
    typeof input === "object" &&
    "version" in input &&
    input.version === 1
      ? (input as Partial<ExplorationProgress>)
      : {};
  return {
    version: 1,
    visitedLocationIds: knownIds(record.visitedLocationIds, locationIds),
    openedPhotoSrcs: knownIds(record.openedPhotoSrcs, photoSrcs),
    revealedHintIds: knownIds(record.revealedHintIds, challengeIds),
  };
}

export function restoreExplorationProgress(
  raw: string | null,
): ExplorationProgress {
  try {
    return createExplorationProgress(JSON.parse(raw ?? "null"));
  } catch {
    return createExplorationProgress();
  }
}

export function mergeExplorationProgress(
  left: unknown,
  right: unknown,
): ExplorationProgress {
  const a = createExplorationProgress(left);
  const b = createExplorationProgress(right);
  return createExplorationProgress({
    version: 1,
    visitedLocationIds: [...a.visitedLocationIds, ...b.visitedLocationIds],
    openedPhotoSrcs: [...a.openedPhotoSrcs, ...b.openedPhotoSrcs],
    revealedHintIds: [...a.revealedHintIds, ...b.revealedHintIds],
  });
}

export function recordExplorationEvent(
  progress: unknown,
  event: unknown,
): ExplorationProgress {
  const current = createExplorationProgress(progress);
  if (!event || typeof event !== "object" || !("type" in event)) return current;
  const next = { ...current };
  if (
    event.type === "location-opened" &&
    "locationId" in event &&
    typeof event.locationId === "string"
  )
    next.visitedLocationIds = [...current.visitedLocationIds, event.locationId];
  if (
    event.type === "photo-opened" &&
    "photoSrc" in event &&
    typeof event.photoSrc === "string"
  )
    next.openedPhotoSrcs = [...current.openedPhotoSrcs, event.photoSrc];
  if (
    event.type === "hint-revealed" &&
    "challengeId" in event &&
    typeof event.challengeId === "string"
  )
    next.revealedHintIds = [...current.revealedHintIds, event.challengeId];
  return createExplorationProgress(next);
}

export function getExplorationSummary(input: unknown) {
  const progress = createExplorationProgress(input);
  const completedChallengeIds = availableChallenges
    .filter((challenge) =>
      progress.openedPhotoSrcs.includes(challenge.photoSrc),
    )
    .map((challenge) => challenge.id);
  return {
    visitedCount: progress.visitedLocationIds.length,
    requiredCount: EXPLORATION_LOCATION_GOAL,
    availableLocationCount: locationIds.length,
    milestoneComplete:
      progress.visitedLocationIds.length >= EXPLORATION_LOCATION_GOAL,
    completedChallengeIds,
    entitlement: "not-verified" as const,
  };
}
