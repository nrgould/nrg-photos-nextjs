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

// Only challenges whose photograph is published. Add one when its photo ships.
export const explorationChallenges = [
  {
    id: "find-red-boat",
    title: "Find the red boat",
    clue: "A small flash of red, surrounded by Arctic water and snow.",
    photoSrc: "/photos/landscape_sailboat_in_a_blizzard.webp",
    photoTitle: "Into the Arctic",
  },
] as const;

export type ExplorationProgress = {
  version: 1;
  visitedLocationIds: string[];
  openedPhotoSrcs: string[];
};
export type ExplorationEvent =
  | { type: "location-opened"; locationId: string }
  | { type: "photo-opened"; photoSrc: string };

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
  return createExplorationProgress(next);
}

export function getExplorationSummary(input: unknown) {
  const progress = createExplorationProgress(input);
  const completedChallengeIds = explorationChallenges
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

export type ExplorationMoment =
  | { kind: "location"; label: string; count: number; goal: number }
  | { kind: "challenge"; title: string };

/** What a single recorded event just advanced, for the progress toast. */
export function describeExplorationProgress(
  before: unknown,
  after: unknown,
): ExplorationMoment | null {
  const a = getExplorationSummary(before);
  const b = getExplorationSummary(after);
  const found = b.completedChallengeIds.find(
    (id) => !a.completedChallengeIds.includes(id),
  );
  if (found)
    return {
      kind: "challenge",
      title: explorationChallenges.find((c) => c.id === found)!.title,
    };
  if (b.visitedCount <= a.visitedCount || a.milestoneComplete) return null;
  const visited = createExplorationProgress(after).visitedLocationIds;
  const id = visited.find(
    (location) =>
      !createExplorationProgress(before).visitedLocationIds.includes(location),
  );
  return {
    kind: "location",
    label: explorationLocations.find((l) => l.id === id)?.label ?? "",
    count: Math.min(b.visitedCount, b.requiredCount),
    goal: b.requiredCount,
  };
}
