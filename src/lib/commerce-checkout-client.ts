import { getCatalogPreset } from "./preset-commerce";
import { safePresetReturnPath } from "./preset-cart-storage";

export type CheckoutAttempt = { requestId: string; key: string };
export type OwnershipSnapshot = {
  sessionKey: string;
  revision: number;
  presetIds: string[];
};

export function checkoutReturnPath(value: string): string {
  const url = new URL(
    safePresetReturnPath(value),
    "https://photography.invalid",
  );
  url.searchParams.delete("checkout");
  url.searchParams.sort();
  return `${url.pathname}${url.search}`;
}

export function currentOwnership(
  snapshot: OwnershipSnapshot | null,
  sessionKey: string | null,
  revision: number,
  available: boolean,
): string[] | null {
  return available &&
    sessionKey &&
    snapshot?.sessionKey === sessionKey &&
    snapshot.revision === revision
    ? snapshot.presetIds
    : null;
}
export function checkoutAttempt(
  userId: string,
  presetIds: readonly string[],
  returnPath: string,
  previous: unknown,
  createId: () => string,
): CheckoutAttempt {
  const ids = [...new Set(presetIds)].sort();
  if (!userId || !ids.length || ids.some((id) => !getCatalogPreset(id)))
    throw new Error("Invalid checkout selection");
  const key = JSON.stringify([userId, ids, checkoutReturnPath(returnPath)]);
  if (
    previous &&
    typeof previous === "object" &&
    "key" in previous &&
    previous.key === key &&
    "requestId" in previous &&
    typeof previous.requestId === "string" &&
    /^[a-zA-Z0-9_-]{16,100}$/.test(previous.requestId)
  )
    return { key, requestId: previous.requestId };
  const requestId = createId();
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestId))
    throw new Error("Invalid checkout request ID");
  return { key, requestId };
}

export function verifiedOwnership(value: unknown): string[] | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("status" in value) ||
    value.status !== "verified" ||
    !("presetIds" in value) ||
    !Array.isArray(value.presetIds) ||
    value.presetIds.some(
      (id) => typeof id !== "string" || !getCatalogPreset(id),
    )
  )
    return null;
  return [...new Set(value.presetIds as string[])];
}

export function stripeCheckoutUrl(value: unknown): string | null {
  if (
    !value ||
    typeof value !== "object" ||
    !("url" in value) ||
    typeof value.url !== "string"
  )
    return null;
  try {
    const url = new URL(value.url);
    return url.origin === "https://checkout.stripe.com" &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
