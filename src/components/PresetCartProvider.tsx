"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  addCartPreset,
  createPresetCart,
  pricePresetCart,
  removeCartPreset,
  type PresetCartState,
} from "@/lib/preset-cart";
import { selectionFeedback } from "@/lib/haptics";
import { getCatalogPreset } from "@/lib/preset-commerce";
import {
  PRESET_CART_STORAGE_KEY,
  restorePresetCart,
  serializePresetCart,
} from "@/lib/preset-cart-storage";

const emptySnapshot = serializePresetCart(createPresetCart());
const changeEvent = "photography-preset-cart-change";
let memorySnapshot: string | null = null;

function getSnapshot() {
  if (memorySnapshot !== null) return memorySnapshot;
  try {
    return (
      window.localStorage.getItem(PRESET_CART_STORAGE_KEY) ?? emptySnapshot
    );
  } catch {
    return emptySnapshot;
  }
}

function subscribe(onChange: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === PRESET_CART_STORAGE_KEY || event.key === null) {
      memorySnapshot = null;
      onChange();
    }
  }
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(changeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function updateStoredCart(update: (cart: PresetCartState) => PresetCartState) {
  const previous = getSnapshot();
  const next = serializePresetCart(update(restorePresetCart(previous)));
  if (next === previous) return;
  memorySnapshot = next;
  try {
    window.localStorage.setItem(PRESET_CART_STORAGE_KEY, next);
  } catch {
    // The current session remains usable when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent));
  selectionFeedback();
}

type PresetCartContextValue = {
  cart: PresetCartState;
  cartIds: readonly string[];
  ownedPresetIds: readonly string[];
  quote: ReturnType<typeof pricePresetCart>;
  addPreset: (id: string) => void;
  removePreset: (id: string) => void;
  clearCart: () => void;
  addPresets: (ids: readonly string[]) => void;
};
const PresetCartContext = createContext<PresetCartContextValue | null>(null);

export function PresetCartProvider({
  children,
  ownedPresetIds = [],
}: {
  children: ReactNode;
  /** Server-confirmed entitlements only. Never restore ownership from browser storage. */
  ownedPresetIds?: readonly string[];
}) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => emptySnapshot,
  );
  const value = useMemo(() => {
    const owned = [
      ...new Set(ownedPresetIds.filter((id) => getCatalogPreset(id))),
    ];
    const stored = restorePresetCart(snapshot);
    const cart = createPresetCart({
      ...stored,
      paidPresetIds: stored.paidPresetIds.filter((id) => !owned.includes(id)),
    });
    return {
      cart,
      cartIds: cart.paidPresetIds,
      ownedPresetIds: owned,
      quote: pricePresetCart(cart),
      addPreset: (id: string) => {
        if (!owned.includes(id))
          updateStoredCart((current) => addCartPreset(current, id));
      },
      addPresets: (ids: readonly string[]) =>
        updateStoredCart((current) =>
          ids.reduce(
            (next, id) => (owned.includes(id) ? next : addCartPreset(next, id)),
            current,
          ),
        ),
      removePreset: (id: string) =>
        updateStoredCart((current) => removeCartPreset(current, id)),
      clearCart: () => updateStoredCart(() => createPresetCart()),
    };
  }, [snapshot, ownedPresetIds]);
  return <PresetCartContext value={value}>{children}</PresetCartContext>;
}

export function usePresetCart() {
  const value = useContext(PresetCartContext);
  if (!value) throw new Error("usePresetCart requires PresetCartProvider");
  return value;
}
