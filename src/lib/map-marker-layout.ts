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
