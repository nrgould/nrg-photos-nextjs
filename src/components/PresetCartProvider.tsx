"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { track } from "@/lib/analytics";
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
import { createStoredSnapshot } from "./storedSnapshot";

const cartStore = createStoredSnapshot(
  PRESET_CART_STORAGE_KEY,
  serializePresetCart(createPresetCart()),
);

function updateStoredCart(update: (cart: PresetCartState) => PresetCartState) {
  const next = serializePresetCart(update(restorePresetCart(cartStore.get())));
  if (cartStore.set(next)) selectionFeedback();
}

/** How the shopper chose: one preset, Add all, or Add all on a filtered list. */
export type AddVia = "single" | "all" | "matching";

type PresetCartContextValue = {
  cart: PresetCartState;
  cartIds: readonly string[];
  ownedPresetIds: readonly string[];
  quote: ReturnType<typeof pricePresetCart>;
  removePreset: (id: string) => void;
  clearCart: () => void;
  addPresets: (ids: readonly string[], via: AddVia) => void;
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
  const snapshot = cartStore.use();
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
      addPresets: (ids: readonly string[], via: AddVia) => {
        track("preset-added", { presets: ids.length, presetIds: ids, via });
        updateStoredCart((current) =>
          ids.reduce(
            (next, id) => (owned.includes(id) ? next : addCartPreset(next, id)),
            current,
          ),
        );
      },
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
