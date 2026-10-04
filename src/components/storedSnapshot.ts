"use client";

import { useSyncExternalStore } from "react";

/**
 * A serialized value kept in localStorage so it survives reloads and the
 * Stripe checkout round trip. Memory keeps the session usable when storage
 * is blocked; other tabs pick up writes through the storage event.
 */
export function createStoredSnapshot(key: string, empty: string) {
  const changeEvent = `stored-snapshot:${key}`;
  let memory: string | null = null;

  function get() {
    if (memory !== null) return memory;
    try {
      return window.localStorage.getItem(key) ?? empty;
    } catch {
      return empty;
    }
  }
  function subscribe(onChange: () => void) {
    function onStorage(event: StorageEvent) {
      if (event.key !== key && event.key !== null) return;
      memory = null;
      onChange();
    }
    window.addEventListener(changeEvent, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(changeEvent, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  /** Returns false when nothing changed. */
  function set(next: string) {
    if (next === get()) return false;
    memory = next;
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // The current session remains usable when browser storage is unavailable.
    }
    window.dispatchEvent(new Event(changeEvent));
    return true;
  }
  function use() {
    return useSyncExternalStore(subscribe, get, () => empty);
  }
  return { get, set, use };
}
