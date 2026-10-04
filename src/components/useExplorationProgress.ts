"use client";

import { useCallback, useMemo } from "react";
import {
  createExplorationProgress,
  describeExplorationProgress,
  EXPLORATION_STORAGE_KEY,
  recordExplorationEvent,
  restoreExplorationProgress,
  type ExplorationEvent,
} from "@/lib/exploration-progress";
import { createStoredSnapshot } from "./storedSnapshot";

const progressStore = createStoredSnapshot(
  EXPLORATION_STORAGE_KEY,
  JSON.stringify(createExplorationProgress()),
);

export function useExplorationProgress() {
  const snapshot = progressStore.use();
  const progress = useMemo(
    () => restoreExplorationProgress(snapshot),
    [snapshot],
  );
  const record = useCallback((event: ExplorationEvent) => {
    const before = restoreExplorationProgress(progressStore.get());
    const after = recordExplorationEvent(before, event);
    return progressStore.set(JSON.stringify(after))
      ? describeExplorationProgress(before, after)
      : null;
  }, []);
  return { progress, record };
}
