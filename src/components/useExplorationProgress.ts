"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  createExplorationProgress,
  EXPLORATION_STORAGE_KEY,
  mergeExplorationProgress,
  recordExplorationEvent,
  restoreExplorationProgress,
  type ExplorationEvent,
} from "@/lib/exploration-progress";

const emptySnapshot = JSON.stringify(createExplorationProgress());
const changeEvent = "photography-exploration-progress-change";
let memorySnapshot: string | null = null;

function readStorage() {
  try {
    return window.localStorage.getItem(EXPLORATION_STORAGE_KEY);
  } catch {
    return null;
  }
}
function getSnapshot() {
  return memorySnapshot ?? readStorage() ?? emptySnapshot;
}
function persist(snapshot: string) {
  memorySnapshot = snapshot;
  try {
    window.localStorage.setItem(EXPLORATION_STORAGE_KEY, snapshot);
  } catch {
    /* Local achievements remain usable for this browser session. */
  }
}
function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key !== EXPLORATION_STORAGE_KEY && event.key !== null) return;
    if (event.newValue === null) memorySnapshot = null;
    else {
      const merged = JSON.stringify(
        mergeExplorationProgress(
          restoreExplorationProgress(memorySnapshot),
          restoreExplorationProgress(event.newValue),
        ),
      );
      if (merged !== event.newValue) persist(merged);
      else memorySnapshot = merged;
    }
    onChange();
  }
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useExplorationProgress() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => emptySnapshot,
  );
  const progress = useMemo(
    () => restoreExplorationProgress(snapshot),
    [snapshot],
  );
  const record = useCallback((event: ExplorationEvent) => {
    const current = mergeExplorationProgress(
      restoreExplorationProgress(getSnapshot()),
      restoreExplorationProgress(readStorage()),
    );
    const next = JSON.stringify(recordExplorationEvent(current, event));
    if (next === getSnapshot()) return;
    persist(next);
    window.dispatchEvent(new Event(changeEvent));
  }, []);
  return { progress, record };
}
