import { createPresetCart, type PresetCartState } from "./preset-cart";

export const PRESET_CART_STORAGE_KEY = "photography-preset-cart-v1";

export function restorePresetCart(raw: string | null): PresetCartState {
  try {
    return createPresetCart(JSON.parse(raw ?? "null"));
  } catch {
    return createPresetCart();
  }
}

export function serializePresetCart(cart: PresetCartState): string {
  return JSON.stringify(createPresetCart(cart));
}

export function formatPresetPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function safePresetReturnPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/";
  try {
    const url = new URL(value, "https://photography.invalid");
    if (url.origin !== "https://photography.invalid" || url.pathname !== "/")
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
