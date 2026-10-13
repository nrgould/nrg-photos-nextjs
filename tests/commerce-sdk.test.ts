import { test } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createStripeGateway } from "../src/lib/server/commerce/stripe";
import {
  createCommerceService,
  quotePresets,
} from "../src/lib/server/commerce/service";
import { CommerceError, type Order } from "../src/lib/server/commerce/types";
import type { CommerceConfiguration } from "../src/lib/server/commerce/config";
import { MemoryCommerceStore } from "./support/commerce-memory-store";

const configuration: CommerceConfiguration = {
  mode: "stripe-test",
  origin: "https://photography.example",
  stripeSecretKey: "sk_test_fixture_not_a_credential",
  webhookSecret: "whsec_fixture_not_a_credential",
  supabaseUrl: "https://fixture.supabase.co",
  supabasePublishableKey: "sb_publishable_fixture_not_a_credential",
  priceIds: { "eibsee-1": "price_fixture" },
  bulkCouponId: "coupon_fixture",
};
let networkCalls = 0;
const stripe = new Stripe(configuration.stripeSecretKey, {
  httpClient: Stripe.createFetchHttpClient(async () => {
    networkCalls++;
    throw new Error("Fixture must never contact Stripe");
  }),
});
const gateway = createStripeGateway(stripe, configuration);
const order: Order = {
  ...quotePresets(["eibsee-1"], ["eibsee-1"]),
  id: "order-sdk-fixture",
  userId: "user-fixture",
  createdAt: Date.now(),
  returnPath: "/",
  sessionId: "cs_test_fixture",
  paymentIntentId: null,
  status: "pending",
  email: null,
};
const session = {
  id: order.sessionId,
  url: null,
  livemode: false,
  mode: "payment",
  status: "complete",
  payment_status: "paid",
  currency: "usd",
  metadata: { orderId: order.id },
  payment_intent: "pi_fixture",
  amount_subtotal: 199,
  amount_total: 199,
  total_details: { amount_discount: 0, amount_tax: 0, amount_shipping: 0 },
};
const event = (
  id = "evt_sdk_paid",
  type = "checkout.session.completed",
  object: unknown = session,
) =>
  JSON.stringify(
    { id, object: "event", livemode: false, type, data: { object } },
    null,
    2,
  ) + "\n";
const sign = (
  payload: string,
  timestamp = Math.floor(Date.now() / 1000),
  secret = configuration.webhookSecret,
) => stripe.webhooks.generateTestHeaderString({ payload, secret, timestamp });
const fails = (code: string) => (error: unknown) =>
  error instanceof CommerceError && error.code === code;

test("official Stripe SDK verifies exact raw signatures; tampering, stale signatures and wrong secrets fail", () => {
  const raw = event();
  const signature = sign(raw);
  assert.equal(gateway.verifyWebhook(raw, signature).type, "completed");
  for (const [body, header] of [
    [JSON.stringify(JSON.parse(raw)), signature],
    [raw.replace('"amount_total": 199', '"amount_total": 1'), signature],
    [raw, sign(raw, Math.floor(Date.now() / 1000) - 600)],
    [raw, sign(raw, undefined, "whsec_wrong_fixture")],
    [raw, "t=1,v1=forged"],
  ])
    assert.throws(
      () => gateway.verifyWebhook(body, header),
      fails("invalid_webhook_signature"),
    );
  const live = raw.replace('"livemode": false', '"livemode": true');
  assert.throws(
    () => gateway.verifyWebhook(live, sign(live)),
    fails("livemode_mismatch"),
  );
  assert.equal(networkCalls, 0);
});

test("SDK-signed payment/replay/refund fixtures apply idempotently to account-bound entitlement", async () => {
  const store = new MemoryCommerceStore();
  await store.transaction((tx) => tx.putOrder(order));
  const service = createCommerceService({
    policy: { presetIds: order.presetIds },
    store,
    payments: gateway,
  });
  const paid = event();
  assert.deepEqual(await service.webhook(paid, sign(paid)), {
    duplicate: false,
    purchased: {
      orderId: order.id,
      userId: order.userId,
      presetIds: order.presetIds,
      totalCents: order.totalCents,
    },
  });
  assert.deepEqual(await service.webhook(paid, sign(paid)), {
    duplicate: true,
  });
  assert.deepEqual(await service.ownership("user-fixture"), {
    status: "verified",
    presetIds: ["eibsee-1"],
    rewardPresetId: null,
  });
  assert.deepEqual(await service.ownership("another-user"), {
    status: "verified",
    presetIds: [],
    rewardPresetId: null,
  });
  const refund = event("evt_sdk_refund", "charge.refunded", {
    amount_refunded: 199,
    payment_intent: "pi_fixture",
  });
  await service.webhook(refund, sign(refund));
  const latePaid = event("evt_sdk_paid_late");
  await service.webhook(latePaid, sign(latePaid));
  assert.deepEqual(await service.ownership("user-fixture"), {
    status: "verified",
    presetIds: [],
    rewardPresetId: null,
  });
  assert.equal(networkCalls, 0);
});

test("SDK-signed no-cost completion fulfills once without a PaymentIntent", async () => {
  const store = new MemoryCommerceStore();
  const freeOrder: Order = {
    ...order,
    promotionCodeId: "promo_free_fixture",
    discountCents: 199,
    totalCents: 0,
  };
  await store.transaction((tx) => tx.putOrder(freeOrder));
  const service = createCommerceService({
    policy: { presetIds: order.presetIds },
    store,
    payments: gateway,
    delivery: {
      allowedOrigins: ["https://files.example.test"],
      issueDownload: async () => "https://files.example.test/fixture.xmp",
    },
  });
  const freeSession = {
    ...session,
    payment_status: "no_payment_required",
    payment_intent: null,
    amount_total: 0,
    total_details: { amount_discount: 199, amount_tax: 0, amount_shipping: 0 },
    customer_details: { email: "buyer@example.test" },
  };
  const raw = event("evt_free", "checkout.session.completed", freeSession);
  const result = await service.webhook(raw, sign(raw));
  assert.equal(result.purchased?.totalCents, 0);
  assert.deepEqual((await service.ownership(order.userId)).presetIds, [
    "eibsee-1",
  ]);
  assert.equal(
    (await service.download(order.userId, "eibsee-1")).expiresInSeconds,
    60,
  );
  assert.deepEqual(await service.webhook(raw, sign(raw)), { duplicate: true });
  const later = event(
    "evt_free_later",
    "checkout.session.completed",
    freeSession,
  );
  assert.equal((await service.webhook(later, sign(later))).purchased, null);
  assert.equal(
    await store.transaction(
      async (tx) => (await tx.entitlements(order.userId)).length,
    ),
    1,
  );
  assert.deepEqual(
    (await service.ownership("returning-buyer", "buyer@example.test"))
      .presetIds,
    ["eibsee-1"],
  );
  await assert.rejects(
    service.checkout(order.userId, ["eibsee-1"], "repeat-free-order-0001"),
    fails("already_owned"),
  );
  assert.equal(networkCalls, 0);
});

test("no-cost fulfillment still requires a complete zero-total session; charged orders need a PaymentIntent", async () => {
  for (const variant of ["nonzero", "open", "unpaid", "missing-intent"]) {
    const free = variant === "open" || variant === "unpaid";
    const stored = free
      ? {
          ...order,
          promotionCodeId: "promo_free_fixture",
          discountCents: 199,
          totalCents: 0,
        }
      : order;
    const store = new MemoryCommerceStore();
    await store.transaction((tx) => tx.putOrder(stored));
    const service = createCommerceService({
      policy: { presetIds: order.presetIds },
      store,
      payments: gateway,
    });
    const raw = event(`evt_${variant}`, "checkout.session.completed", {
      ...session,
      status: variant === "open" ? "open" : "complete",
      payment_status:
        variant === "missing-intent"
          ? "paid"
          : variant === "unpaid"
            ? "unpaid"
            : "no_payment_required",
      payment_intent: null,
      amount_total: stored.totalCents,
      total_details: {
        amount_discount: stored.discountCents,
        amount_tax: 0,
        amount_shipping: 0,
      },
    });
    if (variant === "missing-intent")
      await assert.rejects(
        service.webhook(raw, sign(raw)),
        fails("missing_payment_intent"),
      );
    else await service.webhook(raw, sign(raw));
    assert.deepEqual((await service.ownership(order.userId)).presetIds, []);
  }
  assert.equal(networkCalls, 0);
});
