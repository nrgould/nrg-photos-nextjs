import {
  boundsCenter,
  getCoordinateBounds,
  type MapNode,
} from "./map-hierarchy";

export type MarkerAnchor = {
  id: string;
  x: number;
  y: number;
  priority?: boolean;
  visible?: boolean;
};
export type MarkerCallout = Readonly<{ x: number; y: number }>;
export type MarkerLayout = {
  offsets: ReadonlyMap<string, MarkerCallout>;
  /** An impossible dense group needs geographic zoom/aggregation, never hidden hit targets. */
  unresolvedIds: readonly string[];
};

type TargetBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/** Uses the rendered hit target, including callout offset and native world wrapping. */
export function markerTargetVisible(
  target: TargetBounds,
  viewport: TargetBounds,
  covered = false,
): boolean {
  return (
    !covered &&
    [
      target.left,
      target.top,
      target.right,
      target.bottom,
      viewport.left,
      viewport.top,
      viewport.right,
      viewport.bottom,
    ].every(Number.isFinite) &&
    target.right > target.left &&
    target.bottom > target.top &&
    target.right > viewport.left &&
    target.left < viewport.right &&
    target.bottom > viewport.top &&
    target.top < viewport.bottom
  );
}
type Viewport = { width: number; height: number };
type Positioned = { id: string; x: number; y: number };

const defaultOffset = { x: 0, y: -28 };
const candidates: readonly MarkerCallout[] = [
  defaultOffset,
  { x: 0, y: 28 },
  { x: -28, y: 0 },
  { x: 28, y: 0 },
  { x: -30, y: -30 },
  { x: 30, y: -30 },
  { x: -30, y: 30 },
  { x: 30, y: 30 },
];
const byPriority = (a: MarkerAnchor, b: MarkerAnchor) =>
  Number(Boolean(b.priority)) - Number(Boolean(a.priority)) ||
  a.id.localeCompare(b.id);
const position = (anchor: MarkerAnchor, offset: MarkerCallout): Positioned => ({
  id: anchor.id,
  x: anchor.x + offset.x,
  y: anchor.y + offset.y,
});
const overlaps = (a: Positioned, b: Positioned, size: number) =>
  Math.abs(a.x - b.x) < size && Math.abs(a.y - b.y) < size;
const overflow = (point: Positioned, viewport: Viewport) =>
  Math.max(0, 24 - point.x) +
  Math.max(0, point.x + 24 - viewport.width) +
  Math.max(0, 24 - point.y) +
  Math.max(0, point.y + 24 - viewport.height);

function activeAnchors(anchors: readonly MarkerAnchor[], viewport: Viewport) {
  return anchors.filter(
    (anchor) =>
      anchor.visible !== false &&
      Number.isFinite(anchor.x) &&
      Number.isFinite(anchor.y) &&
      anchor.x >= -54 &&
      anchor.x <= viewport.width + 54 &&
      anchor.y >= -54 &&
      anchor.y <= viewport.height + 54,
  );
}

function collisionIds(
  anchors: readonly MarkerAnchor[],
  offsets: ReadonlyMap<string, MarkerCallout>,
) {
  const result = new Set<string>();
  for (let a = 0; a < anchors.length; a++)
    for (let b = a + 1; b < anchors.length; b++) {
      if (
        overlaps(
          position(anchors[a], offsets.get(anchors[a].id)!),
          position(anchors[b], offsets.get(anchors[b].id)!),
          48,
        )
      ) {
        result.add(anchors[a].id);
        result.add(anchors[b].id);
      }
    }
  return [...result].sort();
}

function groups(anchors: readonly MarkerAnchor[]) {
  const pending = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const result: MarkerAnchor[][] = [];
  while (pending.size) {
    const first = [...pending.values()].sort(byPriority)[0];
    const group = [first];
    pending.delete(first.id);
    for (let index = 0; index < group.length; index++) {
      for (const [id, other] of pending) {
        // Maximum per-axis displacement is30px; beyond this range targets cannot collide.
        if (
          Math.abs(group[index].x - other.x) < 112 &&
          Math.abs(group[index].y - other.y) < 112
        ) {
          pending.delete(id);
          group.push(other);
        }
      }
    }
    result.push(group.sort(byPriority));
  }
  return result;
}

function solveGroup(
  anchors: readonly MarkerAnchor[],
  viewport: Viewport,
  offsets: Map<string, MarkerCallout>,
  previous: ReadonlyMap<string, MarkerCallout>,
  fixedIds: ReadonlySet<string>,
) {
  const movable = anchors.filter((anchor) => !fixedIds.has(anchor.id));
  if (!movable.length) return;
  const fixed = anchors
    .filter((anchor) => fixedIds.has(anchor.id))
    .map((anchor) => position(anchor, offsets.get(anchor.id)!));
  const cost = (anchor: MarkerAnchor, offset: MarkerCallout) => {
    const prior = previous.get(anchor.id);
    const movement = prior
      ? Math.hypot(offset.x - prior.x, offset.y - prior.y) *
        (anchor.priority ? 12 : 4)
      : 0;
    return (
      movement +
      Math.hypot(offset.x, offset.y) * 0.2 +
      overflow(position(anchor, offset), viewport) * 100
    );
  };
  const options = movable.map((anchor) => {
    const prior = previous.get(anchor.id);
    const choices = prior
      ? [
          prior,
          ...candidates.filter(
            (candidate) => candidate.x !== prior.x || candidate.y !== prior.y,
          ),
        ]
      : [...candidates];
    return choices
      .map((offset) => ({ offset, cost: cost(anchor, offset) }))
      .sort((a, b) => a.cost - b.cost);
  });
  let best: MarkerCallout[] | null = null;
  for (const clearance of [52, 48]) {
    let bestCost = Infinity;
    let visited = 0;
    const placed = [...fixed];
    const selected: MarkerCallout[] = [];
    function search(index: number, total: number) {
      if (++visited > 30000 || total >= bestCost) return;
      if (index === movable.length) {
        bestCost = total;
        best = [...selected];
        return;
      }
      for (const option of options[index]) {
        const point = position(movable[index], option.offset);
        if (placed.some((other) => overlaps(point, other, clearance))) continue;
        placed.push(point);
        selected.push(option.offset);
        search(index + 1, total + option.cost);
        selected.pop();
        placed.pop();
      }
    }
    search(0, 0);
    if (best) break;
  }
  if (best) {
    movable.forEach((anchor, index) => offsets.set(anchor.id, best![index]));
    return;
  }
  // Bounded fallback for overfull geometry; unresolvedIds explicitly exposes remaining collisions.
  for (let pass = 0; pass < 3; pass++)
    for (const anchor of movable) {
      let lowest = Infinity;
      let chosen = offsets.get(anchor.id)!;
      for (const option of candidates) {
        const point = position(anchor, option);
        let penalty = cost(anchor, option);
        for (const other of anchors) {
          if (other.id === anchor.id) continue;
          const occupied = position(other, offsets.get(other.id)!);
          penalty +=
            Math.max(0, 52 - Math.abs(point.x - occupied.x)) *
            Math.max(0, 52 - Math.abs(point.y - occupied.y)) *
            10000;
        }
        if (penalty < lowest) {
          lowest = penalty;
          chosen = option;
        }
      }
      offsets.set(anchor.id, chosen);
    }
}

/** Call on membership changes or moveend/resize. During gestures all existing assignments are frozen. */
export function layoutMapMarkers({
  anchors,
  viewport,
  previous,
  moving = false,
}: {
  anchors: readonly MarkerAnchor[];
  viewport: Viewport;
  previous?: MarkerLayout;
  moving?: boolean;
}): MarkerLayout {
  const prior = previous?.offsets ?? new Map<string, MarkerCallout>();
  const offsets = new Map(
    anchors.map((anchor) => [anchor.id, prior.get(anchor.id) ?? defaultOffset]),
  );
  const active = activeAnchors(anchors, viewport);
  const fixedIds = new Set(
    moving
      ? anchors
          .filter((anchor) => prior.has(anchor.id))
          .map((anchor) => anchor.id)
      : [],
  );
  const newMembership = anchors.some((anchor) => !prior.has(anchor.id));
  if (moving && !newMembership)
    return { offsets, unresolvedIds: previous?.unresolvedIds ?? [] };
  const existingCollisions = collisionIds(active, offsets);
  // Preserve52px-clearance layouts down to48px: minor anchor changes cannot reshuffle callouts.
  if (
    !newMembership &&
    !existingCollisions.length &&
    active.every(
      (anchor) =>
        overflow(position(anchor, offsets.get(anchor.id)!), viewport) <= 2,
    )
  )
    return { offsets, unresolvedIds: [] };
  for (const group of groups(active)) {
    const unchangedGroup = group.every((anchor) => prior.has(anchor.id));
    if (
      unchangedGroup &&
      !collisionIds(group, offsets).length &&
      group.every(
        (anchor) =>
          overflow(position(anchor, offsets.get(anchor.id)!), viewport) <= 2,
      )
    )
      continue;
    solveGroup(group, viewport, offsets, prior, fixedIds);
  }
  return { offsets, unresolvedIds: collisionIds(active, offsets) };
}

/** Web Mercator world pixels at an engine zoom, in marker layout space. */
function worldPoint([longitude, latitude]: [number, number], zoom: number) {
  const size = 512 * 2 ** zoom;
  const y = Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360));
  return {
    x: ((longitude + 180) / 360) * size,
    y: (0.5 - y / (2 * Math.PI)) * size,
  };
}

/**
 * Location pins the callout layout cannot separate at this zoom become one cluster,
 * which zooms in on click. Groups the layout can fan out stay individual pins.
 */
export function clusterMapNodes(
  nodes: readonly MapNode[],
  zoom: number,
  scale = 1,
): MapNode[] {
  const originals = new Map(nodes.map((node) => [node.id, node]));
  let result = [...nodes];
  for (let pass = 0; pass < 5; pass++) {
    const anchors = result.map((node) => {
      const point = worldPoint(node.coordinates, zoom);
      return { id: node.id, x: point.x / scale, y: point.y / scale };
    });
    const left = Math.min(...anchors.map((anchor) => anchor.x)) - 100;
    const top = Math.min(...anchors.map((anchor) => anchor.y)) - 100;
    for (const anchor of anchors) {
      anchor.x -= left;
      anchor.y -= top;
    }
    const viewport = {
      width: Math.max(...anchors.map((anchor) => anchor.x)) + 100,
      height: Math.max(...anchors.map((anchor) => anchor.y)) + 100,
    };
    const { unresolvedIds } = layoutMapMarkers({ anchors, viewport });
    if (!unresolvedIds.length) return result;
    const byId = new Map(result.map((node) => [node.id, node]));
    const point = new Map(anchors.map((anchor) => [anchor.id, anchor]));
    // Each unresolved pin seeds a group that takes in every same-country pin its target touches.
    const pending = new Set(result.map((node) => node.id));
    const merged = new Set<string>();
    const clusters: MapNode[] = [];
    for (const seed of unresolvedIds) {
      if (!pending.delete(seed)) continue;
      const group = [byId.get(seed)!];
      for (let index = 0; index < group.length; index++)
        for (const id of pending) {
          const a = point.get(group[index].id)!;
          const b = point.get(id)!;
          if (
            byId.get(id)!.countryId === group[0].countryId &&
            Math.abs(a.x - b.x) < 56 &&
            Math.abs(a.y - b.y) < 56
          ) {
            pending.delete(id);
            group.push(byId.get(id)!);
          }
        }
      if (group.length < 2) continue;
      for (const node of group) merged.add(node.id);
      clusters.push(cluster(group, originals));
    }
    if (!clusters.length) return result;
    result = [...result.filter((node) => !merged.has(node.id)), ...clusters];
  }
  return result;
}

function cluster(
  group: readonly MapNode[],
  originals: ReadonlyMap<string, MapNode>,
): MapNode {
  const members = group
    .flatMap((node) => node.memberIds ?? [node.id])
    .map((id) => originals.get(id)!)
    .sort((a, b) => b.photoCount - a.photoCount || a.id.localeCompare(b.id));
  const memberIds = members.map((node) => node.id);
  const photos = members.flatMap((node) => node.photos);
  return {
    id: `cluster:${[...memberIds].sort().join("+")}`,
    kind: "cluster",
    label: `${members[0].label} +${members.length - 1}`,
    coordinates: boundsCenter(
      getCoordinateBounds(members.map((node) => node.coordinates))!,
    ),
    collectionId: members[0].collectionId,
    countryId: members[0].countryId,
    photos,
    photoCount: photos.length,
    cover: members[0].cover,
    precision: "regional",
    referenceLabel: members.map((node) => node.label).join(", "),
    memberIds,
  };
}
