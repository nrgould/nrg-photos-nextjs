import { getMapNodes } from "./map-hierarchy";
import { travelPlaces } from "./places";

export const EXPLORATION_LOCATION_GOAL = 5;
export const EXPLORATION_SAVE_GOAL = 3;
export const EXPLORATION_STORAGE_KEY = "photography-exploration-progress-v1";

export const explorationLocations = getMapNodes(travelPlaces, "location")
  .filter((node) => node.precision === "regional")
  .map(({ id, label, photoCount, cover }) => ({
    id,
    label,
    photoCount,
    cover,
  }));

const locationIds = explorationLocations.map((location) => location.id);
const photoSrcs = [
  ...new Set(
    travelPlaces.flatMap((place) => place.photos.map((photo) => photo.src)),
  ),
];

// Anything the heart can save: photos and places at every level.
const favoriteIds = [
  ...photoSrcs,
  ...getMapNodes(travelPlaces, "country").map((node) => node.id),
  ...getMapNodes(travelPlaces, "location").map((node) => node.id),
];

// Only challenges whose photograph is published. Add one when its photo ships.
// Opening any of a challenge's photographs finds it.
export const explorationChallenges: readonly {
  id: string;
  title: string;
  clue: string;
  photoSrcs: readonly string[];
  photoTitle: string;
}[] = [
  {
    id: "find-red-boat",
    title: "Find the red boat",
    clue: "A small flash of red, surrounded by Arctic water and snow.",
    photoSrcs: ["/photos/lr-4337389.webp"],
    photoTitle: "Sommarøy",
  },
  {
    id: "find-cat",
    title: "Find the cat",
    clue: "A small traveler in a bag, among spring crocuses in a Swedish university town.",
    photoSrcs: ["/photos/lr-2366344.webp", "/photos/lr-2366347.webp"],
    photoTitle: "Lund",
  },
];

export type ExplorationProgress = {
  version: 1;
  visitedLocationIds: string[];
  openedPhotoSrcs: string[];
  /** Ever saved, so unsaving later does not undo the challenge. */
  savedIds: string[];
};
export type ExplorationEvent =
  | { type: "location-opened"; locationId: string }
  | { type: "photo-opened"; photoSrc: string }
  | { type: "favorite-saved"; id: string };

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
    savedIds: knownIds(record.savedIds, favoriteIds),
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
  if (
    event.type === "favorite-saved" &&
    "id" in event &&
    typeof event.id === "string"
  )
    next.savedIds = [...current.savedIds, event.id];
  return createExplorationProgress(next);
}

export function getExplorationSummary(input: unknown) {
  const progress = createExplorationProgress(input);
  /** Challenge id → the photograph that found it. */
  const foundSrcs: Record<string, string> = {};
  for (const challenge of explorationChallenges) {
    const src = progress.openedPhotoSrcs.find((opened) =>
      challenge.photoSrcs.includes(opened),
    );
    if (src) foundSrcs[challenge.id] = src;
  }
  const completedChallengeIds = explorationChallenges
    .filter((challenge) => challenge.id in foundSrcs)
    .map((challenge) => challenge.id);
  const milestoneComplete =
    progress.visitedLocationIds.length >= EXPLORATION_LOCATION_GOAL;
  const savesComplete = progress.savedIds.length >= EXPLORATION_SAVE_GOAL;
  // The places and saves goals are challenges too; the free preset needs all of them.
  const challengeCount = explorationChallenges.length + 2;
  const doneCount =
    completedChallengeIds.length +
    Number(milestoneComplete) +
    Number(savesComplete);
  return {
    visitedCount: progress.visitedLocationIds.length,
    requiredCount: EXPLORATION_LOCATION_GOAL,
    availableLocationCount: locationIds.length,
    milestoneComplete,
    savedIds: progress.savedIds.slice(0, EXPLORATION_SAVE_GOAL),
    saveGoal: EXPLORATION_SAVE_GOAL,
    savesComplete,
    completedChallengeIds,
    foundSrcs,
    challengeCount,
    doneCount,
    allComplete: doneCount === challengeCount,
    entitlement: "not-verified" as const,
  };
}

export type ExplorationMoment =
  | { kind: "location"; label: string; count: number; goal: number }
  | { kind: "challenge"; title: string; done: "Found" | "Saved" }
  | { kind: "complete"; count: number };

/** What a single recorded event just advanced, for the progress toast. */
export function describeExplorationProgress(
  before: unknown,
  after: unknown,
): ExplorationMoment | null {
  const a = getExplorationSummary(before);
  const b = getExplorationSummary(after);
  if (b.allComplete && !a.allComplete)
    return { kind: "complete", count: b.challengeCount };
  const found = b.completedChallengeIds.find(
    (id) => !a.completedChallengeIds.includes(id),
  );
  if (found)
    return {
      kind: "challenge",
      title: explorationChallenges.find((c) => c.id === found)!.title,
      done: "Found",
    };
  if (b.savesComplete && !a.savesComplete)
    return {
      kind: "challenge",
      title: `Save ${b.saveGoal} favorites`,
      done: "Saved",
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
