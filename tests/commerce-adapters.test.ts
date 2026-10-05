import { presetCatalog } from "../src/lib/preset-commerce";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readCommerceConfiguration,
  type TestCommerceConfiguration,
} from "../src/lib/server/commerce/config";
import { createSessionAuthenticator } from "../src/lib/server/commerce/auth";
import { createCommerceHandlers } from "../src/lib/server/commerce/http";
import {
  createStripeGateway,
  type StripeClient,
  type StripeCheckoutParameters,
} from "../src/lib/server/commerce/stripe";
import {
  createCommerceService,
  quotePresets,
} from "../src/lib/server/commerce/service";
import {
  CommerceError,
  type CommerceStore,
  type Order,
} from "../src/lib/server/commerce/types";
import { MemoryCommerceStore } from "./support/commerce-memory-store";

const ids = presetCatalog.map((preset) => preset.id);
const priceIds = Object.fromEntries(
  ids.map((id, index) => [id, `price_fixture${index}`]),
);
const env = {
  COMMERCE_MODE: "stripe-test",
  COMMERCE_ORIGIN: "http://localhost:3000",
  STRIPE_SECRET_KEY: "sk_test_fixture_not_a_credential",
  STRIPE_WEBHOOK_SECRET: "whsec_fixture_not_a_credential",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  STRIPE_PRESET_PRICE_IDS: JSON.stringify(priceIds),
  STRIPE_BULK_COUPON_ID: "coupon_fixture",
};
const config = (
  readCommerceConfiguration(env, ids) as {
    status: "configured";
    configuration: TestCommerceConfiguration;
  }
).configuration;
const fails = (code: string) => (error: unknown) =>
  error instanceof CommerceError && error.code === code;
const order = (count = 1): Order => ({
  ...quotePresets(ids.slice(0, count), ids),
  id: "order-fixture",
  userId: "user-A",
  createdAt: Date.now(),
  returnPath: "/",
  status: "pending",
  sessionId: null,
  paymentIntentId: null,
});
function sdkFixture() {
  const current = order();
  const session = {
    id: "cs_test_fixture",
    url: "https://checkout.stripe.com/fixture",
    livemode: false,
    mode: "payment",
    status: "open",
    payment_status: "unpaid",
    currency: "usd",
    metadata: { orderId: current.id },
    payment_intent: null as string | null,
    amount_subtotal: current.subtotalCents,
    amount_total: current.totalCents,
    total_details: { amount_discount: 0, amount_tax: 0, amount_shipping: 0 },
  };
  let event: unknown = {
    id: "evt_fixture",
    livemode: false,
    type: "checkout.session.completed",
    data: { object: session },
  };
  const creations: { params: StripeCheckoutParameters; key: string }[] = [];
  const signatures: unknown[] = [];
  const client: StripeClient = {
    prices: {
      async retrieve(id) {
        return {
          id,
          active: true,
          livemode: false,
          currency: "usd",
          unit_amount: 199,
          type: "one_time",
        };
      },
    },
    coupons: {
      async retrieve(id) {
        return {
          id,
          valid: true,
          livemode: false,
          percent_off: 20,
          amount_off: null,
          duration: "once",
        };
      },
    },
    checkout: {
      sessions: {
        async create(params, options) {
          creations.push({ params, key: options.idempotencyKey });
          return session;
        },
        async retrieve() {
          return session;
        },
      },
    },
    webhooks: {
      constructEvent(raw, signature, secret) {
        signatures.push([raw, signature, secret]);
        if (signature !== "valid-fixture-signature")
          throw new Error("SDK signature rejection");
        return event;
      },
    },
  };
  return {
    client,
    current,
    session,
    creations,
    signatures,
    event: (next: unknown) => {
      event = next;
    },
  };
}

test("configuration is disabled by default and rejects live, partial or unsafe configuration", () => {
  assert.deepEqual(readCommerceConfiguration({}, ids), { status: "disabled" });
  assert.equal(readCommerceConfiguration(env, ids).status, "configured");
  for (const patch of [
    { COMMERCE_MODE: "live" },
    { STRIPE_SECRET_KEY: "sk_live_fixture" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" },
    { NEXT_PUBLIC_SUPABASE_URL: "" },
    { STRIPE_WEBHOOK_SECRET: "" },
    { STRIPE_BULK_COUPON_ID: "" },
    { COMMERCE_ORIGIN: "http://public.example" },
    { COMMERCE_ORIGIN: "https://example.test/redirect" },
    { COMMERCE_ORIGIN: "https://user:pass@example.test" },
    { STRIPE_PRESET_PRICE_IDS: "{}" },
    {
      STRIPE_PRESET_PRICE_IDS: JSON.stringify(
        Object.fromEntries(ids.map((id) => [id, "price_same"])),
      ),
    },
  ])
    assert.deepEqual(readCommerceConfiguration({ ...env, ...patch }, ids), {
      status: "invalid",
    });
});

test("unconfigured HTTP and test-memory-store HTTP make no provider/auth calls and never report owned", async () => {
  const f = sdkFixture();
  const payments = createStripeGateway(f.client, config);
  const store = new MemoryCommerceStore();
  const service = createCommerceService({
    policy: { presetIds: ids },
    store,
    payments,
  });
  let authCalls = 0;
  for (const configuration of [
    { status: "disabled" } as const,
    { status: "configured", configuration: config } as const,
  ]) {
    const handlers = createCommerceHandlers({
      configuration,
      store,
      service,
      authenticate: async () => {
        authCalls++;
        return { userId: "user-A", email: null };
      },
    });
    assert.deepEqual(await handlers.availability().json(), {
      status: "unavailable",
    });
    for (const response of await Promise.all([
      handlers.checkout(
        new Request("http://localhost:3000/api/checkout", { method: "POST" }),
      ),
      handlers.webhook(
        new Request("http://localhost:3000/api/webhooks/stripe", {
          method: "POST",
        }),
      ),
      handlers.ownership(),
      handlers.claimReward(
        new Request("http://localhost:3000/api/rewards", { method: "POST" }),
      ),
      handlers.download(ids[0]),
    ])) {
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: "commerce_not_configured",
      });
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    }
  }
  assert.equal(authCalls, 0);
  assert.equal(f.creations.length, 0);
  assert.equal(f.signatures.length, 0);
});

test("Stripe adapter validates server Price/coupon then emits only fixed test Checkout parameters", async () => {
  const f = sdkFixture();
  const gateway = createStripeGateway(f.client, config);
  await gateway.createCheckout(f.current);
  assert.equal(f.creations[0].key, "preset-order:order-fixture");
  assert.deepEqual(f.creations[0].params.line_items, [
    { price: priceIds[ids[0]], quantity: 1 },
  ]);
  assert.equal(
    f.creations[0].params.success_url,
    "http://localhost:3000/?checkout=returned&view=library",
  );
  assert.equal(
    f.creations[0].params.cancel_url,
    "http://localhost:3000/?checkout=cancelled",
  );
  assert.equal(f.creations[0].params.allow_promotion_codes, false);
  assert.deepEqual(f.creations[0].params.automatic_tax, { enabled: false });
  assert.equal(f.creations[0].params.discounts, undefined);
  await gateway.createCheckout(order(10));
  assert.deepEqual(f.creations[1].params.discounts, [
    { coupon: "coupon_fixture" },
  ]);
  f.client.prices.retrieve = async (id) => ({
    id,
    active: true,
    livemode: false,
    currency: "usd",
    unit_amount: 1,
    type: "one_time",
  });
  await assert.rejects(
    gateway.createCheckout(f.current),
    fails("price_configuration_mismatch"),
  );
  assert.equal(f.creations.length, 2);
});

test("Stripe adapter rejects wrong coupons and reuses a bound session without creating another", async () => {
  const f = sdkFixture();
  const gateway = createStripeGateway(f.client, config);
  f.client.coupons.retrieve = async (id) => ({
    id,
    valid: true,
    livemode: false,
    percent_off: 100,
    amount_off: null,
    duration: "once",
  });
  await assert.rejects(
    gateway.createCheckout(order(10)),
    fails("discount_configuration_mismatch"),
  );
  await gateway.createCheckout({ ...f.current, sessionId: "cs_test_fixture" });
  assert.equal(f.creations.length, 0);
});

test("Stripe Checkout preserves approved catalog query state and appends one outcome", async () => {
  const f = sdkFixture();
  await createStripeGateway(f.client, config).createCheckout({
    ...f.current,
    returnPath: "/?view=cart&query=alpine&preset=eibsee-1",
  });
  for (const [key, outcome] of [
    ["success_url", "returned"],
    ["cancel_url", "cancelled"],
  ] as const) {
    const url = new URL(f.creations[0].params[key]);
    assert.equal(url.origin, config.origin);
    assert.equal(url.pathname, "/");
    assert.equal(
      url.searchParams.get("view"),
      outcome === "returned" ? "library" : "cart",
    );
    assert.equal(url.searchParams.get("preset"), "eibsee-1");
    assert.equal(url.searchParams.get("query"), "alpine");
    assert.equal(url.searchParams.get("checkout"), outcome);
  }
});

test("webhook forwards exact raw body/signature to SDK and rejects invalid signatures and live events", () => {
  const f = sdkFixture();
  const gateway = createStripeGateway(f.client, config);
  const raw = '{ "spacing" : "preserved" }\n';
  assert.equal(
    gateway.verifyWebhook(raw, "valid-fixture-signature").type,
    "completed",
  );
  assert.deepEqual(f.signatures[0], [
    raw,
    "valid-fixture-signature",
    config.webhookSecret,
  ]);
  assert.throws(
    () => gateway.verifyWebhook(raw, "forged"),
    fails("invalid_webhook_signature"),
  );
  f.event({
    id: "evt_live",
    livemode: true,
    type: "checkout.session.completed",
    data: { object: f.session },
  });
  assert.throws(
    () => gateway.verifyWebhook(raw, "valid-fixture-signature"),
    fails("live_event_rejected"),
  );
  f.event({
    id: "evt_refund",
    livemode: false,
    type: "charge.refunded",
    data: { object: { amount_refunded: 1, payment_intent: "pi_fixture" } },
  });
  assert.deepEqual(gateway.verifyWebhook(raw, "valid-fixture-signature"), {
    id: "evt_refund",
    type: "revoked",
    paymentIntentId: "pi_fixture",
  });
  f.event({
    id: "evt_dispute",
    livemode: false,
    type: "charge.dispute.created",
    data: { object: { payment_intent: "pi_fixture" } },
  });
  assert.equal(
    gateway.verifyWebhook(raw, "valid-fixture-signature").type,
    "revoked",
  );
});

test("session authenticator awaits verified session identity, never a client-supplied account", async () => {
  assert.deepEqual(
    await createSessionAuthenticator(async () => ({
      userId: "verified-user",
    }))(),
    { userId: "verified-user", email: null },
  );
  await assert.rejects(
    createSessionAuthenticator(async () => ({ userId: null }))(),
    fails("unauthenticated"),
  );
  await assert.rejects(
    createSessionAuthenticator(async () => ({ userId: "guest" }))(true),
    fails("email_required"),
  );
  assert.deepEqual(
    await createSessionAuthenticator(async () => ({
      userId: "member",
      email: "member@example.test",
    }))(true),
    { userId: "member", email: "member@example.test" },
  );
});

test("configured handler rejects forged account/price/reward fields, external origins and oversized bodies", async () => {
  const f = sdkFixture();
  const memory = new MemoryCommerceStore();
  // A durable-adapter test double exercises the ready route; the shipped memory store remains rejected.
  const store: CommerceStore = {
    durability: "durable",
    transaction: memory.transaction.bind(memory),
  };
  const payments = createStripeGateway(f.client, config);
  const service = createCommerceService({
    policy: { presetIds: ids },
    store,
    payments,
  });
  const handlers = createCommerceHandlers({
    configuration: { status: "configured", configuration: config },
    store,
    service,
    authenticate: createSessionAuthenticator(async () => ({
      userId: "user-A",
    })),
  });
  assert.deepEqual(await handlers.availability().json(), {
    status: "test-ready",
  });
  const request = (value: unknown, origin = config.origin) =>
    new Request(`${config.origin}/api/commerce/checkout`, {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(value),
    });
  const cart = {
    paidPresetIds: [ids[0]],
    requestId: "http-request-000001",
    returnPath: "/",
  };
  for (const extra of [
    { userId: "victim" },
    { totalCents: 1 },
    { priceId: "price_attacker" },
    { rewardPresetId: ids[1] },
    { visitedLocationIds: ids },
  ])
    assert.equal(
      (await handlers.checkout(request({ ...cart, ...extra }))).status,
      400,
    );
  assert.equal(
    (await handlers.checkout(request(cart, "https://evil.test"))).status,
    403,
  );
  assert.equal(
    (await handlers.checkout(request({ ...cart, returnPath: "//evil.test" })))
      .status,
    400,
  );
  assert.equal(
    (await handlers.checkout(request({ ...cart, requestId: "x".repeat(9000) })))
      .status,
    413,
  );
  assert.equal(
    (
      await handlers.claimReward(
        request({
          presetId: ids[0],
          visitedLocationIds: [
            "fake-1",
            "fake-2",
            "fake-3",
            "fake-4",
            "fake-5",
          ],
        }),
      )
    ).status,
    403,
  );
  assert.equal(f.creations.length, 0);
  assert.equal((await handlers.ownership()).status, 200);
  assert.deepEqual(await (await handlers.ownership()).json(), {
    status: "verified",
    presetIds: [],
    rewardPresetId: null,
  });
  assert.equal((await handlers.download(ids[0])).status, 403);
  assert.equal((await handlers.webhook(request({}))).status, 400);
});
