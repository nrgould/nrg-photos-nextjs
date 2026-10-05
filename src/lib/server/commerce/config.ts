import { getCatalogPreset } from "../../preset-commerce";
import { readAccountConfiguration } from "../account-configuration";

/** The Lemon Squeezy 2025 pack, limited to the presets still on sale. */
export const legacyPackPresetIds: readonly string[] = Object.freeze(
  [
    "stetten-1",
    "eibsee-1",
    "grainau-1",
    "salzburg-1",
    "seiser-alm-1",
    "vienna-1",
    "rome-2",
    "bavaria-1",
    "cary-4",
  ].filter((id) => getCatalogPreset(id)),
);

export type CommerceMode = "stripe-test" | "stripe-live";
export type CommerceConfiguration = {
  mode: CommerceMode;
  origin: string;
  stripeSecretKey: string;
  webhookSecret: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  priceIds: Readonly<Record<string, string>>;
  bulkCouponId: string;
};
export type ConfigurationResult =
  | { status: "disabled" | "invalid" }
  | { status: "configured"; configuration: CommerceConfiguration };

/** Pure: does not read files, instantiate SDKs, provision accounts or contact providers. */
export function readCommerceConfiguration(
  env: Readonly<Record<string, string | undefined>>,
  publishedPresetIds: readonly string[],
): ConfigurationResult {
  if (!env.COMMERCE_MODE || env.COMMERCE_MODE === "disabled")
    return { status: "disabled" };
  const mode = env.COMMERCE_MODE;
  if (mode !== "stripe-test" && mode !== "stripe-live")
    return { status: "invalid" };
  const account = readAccountConfiguration(env);
  if (!account) return { status: "invalid" };
  // A test key never runs in live mode, and a live key never runs in test mode.
  const stripeSecretKey = env.STRIPE_SECRET_KEY ?? "";
  try {
    if (
      !(mode === "stripe-live" ? /^(sk|rk)_live_/ : /^sk_test_/).test(
        stripeSecretKey,
      ) ||
      !env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") ||
      !env.STRIPE_BULK_COUPON_ID
    )
      return { status: "invalid" };
    const priceIds: unknown = JSON.parse(env.STRIPE_PRESET_PRICE_IDS ?? "null");
    if (!priceIds || typeof priceIds !== "object" || Array.isArray(priceIds))
      return { status: "invalid" };
    const entries = Object.entries(priceIds);
    if (
      !publishedPresetIds.length ||
      entries.length !== publishedPresetIds.length ||
      entries.some(
        ([id, price]) =>
          !publishedPresetIds.includes(id) ||
          typeof price !== "string" ||
          !/^price_[a-zA-Z0-9]+$/.test(price),
      ) ||
      new Set(entries.map(([, price]) => price)).size !== entries.length
    )
      return { status: "invalid" };
    return {
      status: "configured",
      configuration: {
        mode,
        origin: account.origin,
        stripeSecretKey,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        supabaseUrl: account.supabaseUrl,
        supabasePublishableKey: account.publishableKey,
        priceIds: Object.freeze(
          Object.fromEntries(entries) as Record<string, string>,
        ),
        bulkCouponId: env.STRIPE_BULK_COUPON_ID,
      },
    };
  } catch {
    return { status: "invalid" };
  }
}
