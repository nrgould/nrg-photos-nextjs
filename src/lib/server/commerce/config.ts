export type TestCommerceConfiguration = {
  mode: "stripe-test";
  origin: string;
  stripeSecretKey: string;
  webhookSecret: string;
  clerkSecretKey: string;
  clerkPublishableKey: string;
  priceIds: Readonly<Record<string, string>>;
  bulkCouponId: string;
};
export type ConfigurationResult =
  | { status: "disabled" | "invalid" }
  | { status: "configured"; configuration: TestCommerceConfiguration };

/** Pure: does not read files, instantiate SDKs, provision accounts or contact providers. */
export function readCommerceConfiguration(
  env: Readonly<Record<string, string | undefined>>,
  publishedPresetIds: readonly string[],
): ConfigurationResult {
  if (!env.COMMERCE_MODE || env.COMMERCE_MODE === "disabled")
    return { status: "disabled" };
  if (env.COMMERCE_MODE !== "stripe-test") return { status: "invalid" };
  try {
    const origin = new URL(env.COMMERCE_ORIGIN ?? "");
    const local =
      origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
    if (
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== "/" ||
      (origin.protocol !== "https:" && !(local && origin.protocol === "http:"))
    )
      return { status: "invalid" };
    if (
      !env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ||
      !env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") ||
      !env.CLERK_SECRET_KEY?.startsWith("sk_test_") ||
      !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_") ||
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
        mode: "stripe-test",
        origin: origin.origin,
        stripeSecretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        clerkSecretKey: env.CLERK_SECRET_KEY,
        clerkPublishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
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
