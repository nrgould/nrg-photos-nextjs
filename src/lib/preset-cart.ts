import { getCatalogPreset } from "./preset-commerce";

export const UNIT_PRICE_CENTS = 199;
export const BULK_DISCOUNT_MINIMUM = 10;
export const BULK_DISCOUNT_PERCENT = 20;
export const REWARD_LOCATION_REQUIREMENT = 5;

export type PresetCartState = {
  paidPresetIds: string[];
  rewardPresetId: string | null;
};

export type PrototypeRewardEligibility = Readonly<{
  kind: "prototype-only";
  eligible: boolean;
  visitedLocationIds: readonly string[];
  visitedCount: number;
  requiredCount: typeof REWARD_LOCATION_REQUIREMENT;
}>;

export function getPrototypeRewardEligibility(
  visitedLocationIds: unknown,
  knownLocationIds: readonly string[],
): PrototypeRewardEligibility {
  const known = new Set(knownLocationIds);
  const visited = Array.isArray(visitedLocationIds)
    ? [
        ...new Set<string>(
          visitedLocationIds.filter(
            (id: unknown): id is string =>
              typeof id === "string" && known.has(id),
          ),
        ),
      ]
    : [];
  return {
    kind: "prototype-only",
    eligible: visited.length >= REWARD_LOCATION_REQUIREMENT,
    visitedLocationIds: visited,
    visitedCount: visited.length,
    requiredCount: REWARD_LOCATION_REQUIREMENT,
  };
}

function rewardAvailable(eligibility?: PrototypeRewardEligibility) {
  return (
    eligibility?.kind === "prototype-only" &&
    eligibility.eligible &&
    new Set(eligibility.visitedLocationIds).size >= REWARD_LOCATION_REQUIREMENT
  );
}

export function createPresetCart(
  input: unknown = null,
  eligibility?: PrototypeRewardEligibility,
): PresetCartState {
  const value =
    input && typeof input === "object"
      ? (input as Partial<PresetCartState>)
      : {};
  const rewardPresetId = rewardAvailable(eligibility)
    ? (getCatalogPreset(value.rewardPresetId)?.id ?? null)
    : null;
  const paidPresetIds = Array.isArray(value.paidPresetIds)
    ? [
        ...new Set(
          value.paidPresetIds.flatMap((id) => {
            const preset = getCatalogPreset(id);
            return preset && preset.id !== rewardPresetId ? [preset.id] : [];
          }),
        ),
      ]
    : [];
  return { paidPresetIds, rewardPresetId };
}

export const sanitizePresetCart = createPresetCart;

export function addCartPreset(
  cart: PresetCartState,
  presetId: unknown,
  eligibility?: PrototypeRewardEligibility,
): PresetCartState {
  const current = createPresetCart(cart, eligibility);
  const preset = getCatalogPreset(presetId);
  if (
    !preset ||
    preset.id === current.rewardPresetId ||
    current.paidPresetIds.includes(preset.id)
  )
    return current;
  return { ...current, paidPresetIds: [...current.paidPresetIds, preset.id] };
}

export function removeCartPreset(
  cart: PresetCartState,
  presetId: unknown,
  eligibility?: PrototypeRewardEligibility,
): PresetCartState {
  const current = createPresetCart(cart, eligibility);
  return {
    paidPresetIds: current.paidPresetIds.filter((id) => id !== presetId),
    rewardPresetId:
      current.rewardPresetId === presetId ? null : current.rewardPresetId,
  };
}

export function selectRewardPreset(
  cart: PresetCartState,
  presetId: unknown,
  eligibility?: PrototypeRewardEligibility,
): PresetCartState {
  const current = createPresetCart(cart, eligibility);
  const preset = getCatalogPreset(presetId);
  if (!rewardAvailable(eligibility) || !preset) return current;
  return {
    paidPresetIds: current.paidPresetIds.filter((id) => id !== preset.id),
    rewardPresetId: preset.id,
  };
}

export function pricePresetCart(
  cart: PresetCartState,
  eligibility?: PrototypeRewardEligibility,
) {
  const current = createPresetCart(cart, eligibility);
  const paidCount = current.paidPresetIds.length;
  const paidSubtotalCents = paidCount * UNIT_PRICE_CENTS;
  const discountPercent =
    paidCount >= BULK_DISCOUNT_MINIMUM ? BULK_DISCOUNT_PERCENT : 0;
  const discountCents = Math.floor(
    (paidSubtotalCents * discountPercent + 50) / 100,
  );
  return {
    currency: "USD" as const,
    unitPriceCents: UNIT_PRICE_CENTS,
    paidCount,
    selectedCount: paidCount + (current.rewardPresetId ? 1 : 0),
    paidSubtotalCents,
    discountPercent,
    discountCents,
    totalCents: paidSubtotalCents - discountCents,
    rewardPresetId: current.rewardPresetId,
    ownership: "unknown" as const,
    checkout: "prototype-only" as const,
  };
}

export function getPresetCartSelection(
  cart: PresetCartState,
  presetId: unknown,
  eligibility?: PrototypeRewardEligibility,
): {
  selection: "paid" | "prototype-reward" | "not-selected";
  ownership: "unknown";
} {
  const current = createPresetCart(cart, eligibility);
  const preset = getCatalogPreset(presetId);
  return {
    selection:
      preset && current.rewardPresetId === preset.id
        ? "prototype-reward"
        : preset && current.paidPresetIds.includes(preset.id)
          ? "paid"
          : "not-selected",
    ownership: "unknown",
  };
}
