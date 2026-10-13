import { presetCatalog } from "../src/lib/preset-commerce";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { parseLegacyOrders } from "../scripts/import-legacy-orders.mjs";
import { legacyPackPresetIds } from "../src/lib/server/commerce/config";
import {
  createCommerceService,
  quotePresets,
  syncLegacyOrders,
} from "../src/lib/server/commerce/service";
import {
  CommerceError,
  type CheckoutSession,
  type CommerceStore,
  type Order,
  type PaymentEvent,
  type PaymentGateway,
  type Promotion,
} from "../src/lib/server/commerce/types";
import {
  createSupabaseDelivery,
  type StorageClient,
} from "../src/lib/server/commerce/supabase-delivery";
import { MemoryCommerceStore } from "./support/commerce-memory-store";
import { dropStores, makeStore } from "./support/commerce-store";

after(dropStores);

const ids = presetCatalog.map((preset) => preset.id);
const requestId = "fixture-request-000001";
const fails = (code: string) => (error: unknown) =>
  error instanceof CommerceError && error.code === code;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture(store = makeStore()) {
  const created: Order[] = [];
  const sessions = new Map<string, CheckoutSession>();
  let incoming: PaymentEvent = { id: "evt_ignored", type: "ignored" };
  const promotions: Record<string, Promotion> = {
    HALF: { id: "promo_half", percentOff: 50, amountOffCents: null },
    SMALL: { id: "promo_small", percentOff: 5, amountOffCents: null },
    // Passes lookup; Stripe refuses it at session create (a minimum amount, say).
    REFUSED: { id: "promo_refused", percentOff: 90, amountOffCents: null },
  };
  const payments: PaymentGateway = {
    async findPromotion(code) {
      return promotions[code.toUpperCase()] ?? null;
    },
    async createCheckout(order) {
      created.push(order);
      if (order.promotionCodeId === "promo_refused")
        throw new CommerceError("invalid_code");
      // Stripe rounds a code's discount its own way; a cent off the estimate.
      const rounding = order.promotionCodeId ? 1 : 0;
      if (!sessions.has(order.id))
        sessions.set(order.id, {
          id: `cs_test_${order.id}`,
          url: "https://checkout.stripe.com/c/pay/fixture",
          orderId: order.id,
          paymentIntentId: null,
          status: "open",
          paymentStatus: "unpaid",
          subtotalCents: order.subtotalCents,
          discountCents: order.discountCents + rounding,
          taxCents: 0,
          totalCents: order.totalCents - rounding,
          currency: "usd",
          email: null,
        });
      return structuredClone(sessions.get(order.id)!);
    },
    async expireCheckout(sessionId) {
      const [orderId, session] = [...sessions].find(
        ([, s]) => s.id === sessionId,
      )!;
      if (session.status === "open")
        sessions.set(orderId, { ...session, status: "expired" });
      return structuredClone(sessions.get(orderId)!);
    },
    verifyWebhook(raw, signature) {
      assert.equal(raw, "unaltered-body");
      if (signature !== "verified-fixture")
        throw new CommerceError("invalid_webhook_signature");
      return incoming;
    },
  };
  const service = createCommerceService({
    policy: { presetIds: ids },
    store,
    payments,
  });
  return {
    store,
    created,
    sessions,
    payments,
    service,
    async event(event: PaymentEvent) {
      incoming = event;
      return service.webhook("unaltered-body", "verified-fixture");
    },
    paid(orderId: string): CheckoutSession {
      return {
        ...sessions.get(orderId)!,
        status: "complete",
        paymentStatus: "paid",
        paymentIntentId: `pi_${orderId}`,
      };
    },
  };
}

test("server quote ignores no client prices and deduplicates before the ten-item threshold", () => {
  for (const [count, discount, total] of [
    [1, 0, 299],
    [9, 0, 2691],
    [10, 598, 2392],
    [11, 658, 2631],
    [28, 1674, 6698],
  ]) {
    const quote = quotePresets(ids.slice(0, count), ids);
    assert.equal(quote.discountCents, discount);
    assert.equal(quote.totalCents, total);
  }
  assert.equal(quotePresets(Array(10).fill(ids[0]), ids).totalCents, 299);
  for (const input of [
    [],
    null,
    ["alpine-soft"],
    [ids[0], "unknown"],
    Array(101).fill(ids[0]),
  ])
    assert.throws(() => quotePresets(input, ids), CommerceError);
});

test("a promotion code applies only when it beats the bulk discount", () => {
  const half = { id: "promo_half", percentOff: 50, amountOffCents: null };
  const small = { id: "promo_small", percentOff: 5, amountOffCents: null };
  const dollar = { id: "promo_dollar", percentOff: null, amountOffCents: 100 };
  assert.deepEqual(pick(quotePresets(ids.slice(0, 10), ids, half)), [
    1495,
    1495,
    "promo_half",
  ]);
  assert.deepEqual(pick(quotePresets(ids.slice(0, 10), ids, small)), [
    598,
    2392,
    null,
  ]);
  assert.deepEqual(pick(quotePresets(ids.slice(0, 1), ids, small)), [
    15,
    284,
    "promo_small",
  ]);
  // An amount off never takes the total below zero.
  assert.deepEqual(
    pick(
      quotePresets(ids.slice(0, 1), ids, { ...dollar, amountOffCents: 500 }),
    ),
    [299, 0, "promo_dollar"],
  );
});
const pick = (quote: ReturnType<typeof quotePresets>) => [
  quote.discountCents,
  quote.totalCents,
  quote.promotionCodeId,
];

test("a code checkout takes Stripe's discount and grants on payment; unknown codes reserve nothing", async () => {
  const f = fixture();
  for (const code of ["NOPE", "bad code!", 7])
    await assert.rejects(
      f.service.checkout("user-A", [ids[0]], requestId, "/", code),
      fails("invalid_code"),
    );
  assert.equal(f.created.length, 0);
  const checkout = await f.service.checkout(
    "user-A",
    ids.slice(0, 10),
    requestId,
    "/",
    "half",
  );
  assert.equal(f.created[0].promotionCodeId, "promo_half");
  const stored = await f.store.transaction((tx) =>
    tx.getOrder(checkout.orderId),
  );
  assert.equal(stored?.discountCents, 1496);
  assert.equal(stored?.totalCents, 1494);
  // The same request without the code is a different basket.
  await assert.rejects(
    f.service.checkout("user-A", ids.slice(0, 10), requestId, "/"),
    fails("request_id_reused"),
  );
  await f.event({
    id: "evt_code_paid",
    type: "completed",
    session: f.paid(checkout.orderId),
  });
  assert.equal((await f.service.ownership("user-A")).presetIds.length, 10);
});

test("a code Stripe refuses releases its reservation for a checkout without it", async () => {
  const f = fixture();
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], requestId, "/", "REFUSED"),
    fails("invalid_code"),
  );
  const checkout = await f.service.checkout(
    "user-A",
    [ids[0]],
    "fixture-request-000002",
    "/",
  );
  assert.ok(checkout.url);
});

test("checkout persists account-bound immutable intent; retries share session and reject tampering", async () => {
  const f = fixture();
  const [first, second] = await Promise.all([
    f.service.checkout("user-A", [ids[0], ids[0]], requestId, "/"),
    f.service.checkout("user-A", [ids[0]], requestId, "/"),
  ]);
  assert.equal(first.orderId, second.orderId);
  assert.equal(f.sessions.size, 1);
  assert.equal(f.created[0].userId, "user-A");
  assert.equal(f.created[0].returnPath, "/");
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, []);
  await assert.rejects(
    f.service.checkout("user-A", [ids[1]], requestId, "/"),
    fails("request_id_reused"),
  );
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], requestId, "/?view=cart"),
    fails("request_id_reused"),
  );
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], requestId, "https://evil.test"),
    fails("invalid_return_path"),
  );
  await assert.rejects(
    f.service.checkout("", [ids[0]], requestId),
    fails("unauthenticated"),
  );
  assert.notEqual(
    (await f.service.checkout("user-B", [ids[0]], requestId)).orderId,
    first.orderId,
  );
});

test("query-state Checkout retries normalize parameter order but reject a changed return destination", async () => {
  const f = fixture();
  const first = await f.service.checkout(
    "user-A",
    [ids[0]],
    requestId,
    "/?view=cart&preset=eibsee-1&query=alpine",
  );
  const second = await f.service.checkout(
    "user-A",
    [ids[0]],
    requestId,
    "/?query=alpine&preset=eibsee-1&view=cart",
  );
  assert.equal(first.orderId, second.orderId);
  assert.equal(
    f.created[0].returnPath,
    "/?preset=eibsee-1&query=alpine&view=cart",
  );
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], requestId, "/?view=catalog"),
    fails("request_id_reused"),
  );
});

test("concurrent different request IDs reserve one basket and reuse one provider session", async () => {
  const f = fixture();
  const gateway = f.payments.createCheckout;
  const started = deferred();
  const release = deferred();
  let calls = 0;
  f.payments.createCheckout = async (order) => {
    if (++calls === 12) started.resolve();
    await release.promise;
    return gateway(order);
  };
  const pending = Array.from({ length: 12 }, (_, index) =>
    f.service.checkout(
      "user-A",
      ids.slice(0, 2),
      `concurrent-request-${String(index).padStart(3, "0")}`,
    ),
  );
  await started.promise;
  assert.equal(
    await f.store.transaction(
      async (tx) => (await tx.pendingOrdersForPresets("user-A", ids)).length,
    ),
    1,
  );
  await assert.rejects(
    f.service.checkout("user-A", [ids[1], ids[2]], "overlapping-request-001"),
    fails("checkout_in_progress"),
  );
  assert.equal(calls, 12);
  release.resolve();
  const results = await Promise.all(pending);
  assert.equal(new Set(results.map((result) => result.orderId)).size, 1);
  assert.equal(f.sessions.size, 1);
  assert.equal(new Set(f.created.map((order) => order.id)).size, 1);
  await assert.rejects(
    f.service.checkout("user-A", [ids[2]], "concurrent-request-001"),
    fails("request_id_reused"),
  );
  await f.event({
    id: "evt_paid",
    type: "paid",
    session: f.paid(results[0].orderId),
  });
  const before = calls;
  for (const request of [
    "concurrent-request-000",
    "concurrent-request-001",
    "brand-new-request-0001",
  ])
    await assert.rejects(
      f.service.checkout("user-A", [ids[0]], request),
      fails("already_owned"),
    );
  assert.equal(calls, before);
});

test("verified expiration releases a pending reservation", async () => {
  const f = fixture();
  const first = await f.service.checkout("user-A", [ids[0]], requestId);
  await f.event({
    id: "evt_expired",
    type: "expired",
    session: { ...f.sessions.get(first.orderId)!, status: "expired" },
  });
  const second = await f.service.checkout(
    "user-A",
    [ids[0]],
    "replacement-request-001",
  );
  assert.notEqual(second.orderId, first.orderId);
});

test("a different basket expires the open overlapping session and replaces it", async () => {
  const f = fixture();
  const first = await f.service.checkout("user-A", ids.slice(0, 3), requestId);
  const second = await f.service.checkout(
    "user-A",
    ids.slice(1, 3),
    "replacement-request-001",
  );
  assert.notEqual(second.orderId, first.orderId);
  assert.equal(f.sessions.get(first.orderId)!.status, "expired");
  assert.equal(f.sessions.get(second.orderId)!.status, "open");
  // The replaced order's late webhook changes nothing.
  await f.event({
    id: "evt_late_expired",
    type: "expired",
    session: f.sessions.get(first.orderId)!,
  });
  const again = await f.service.checkout(
    "user-A",
    ids.slice(1, 3),
    "replacement-request-001",
  );
  assert.equal(again.orderId, second.orderId);
});

test("live mode sessions open checkout and their paid event grants", async () => {
  const f = fixture();
  const createCheckout = f.payments.createCheckout;
  f.payments.createCheckout = async (order) => {
    const session = await createCheckout(order);
    const live = { ...session, id: session.id.replace("cs_test_", "cs_live_") };
    f.sessions.set(order.id, live);
    return live;
  };
  const checkout = await f.service.checkout("user-A", [ids[0]], requestId);
  assert.ok(checkout.url);
  await f.event({
    id: "evt_live_paid",
    type: "completed",
    session: f.paid(checkout.orderId),
  });
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, [ids[0]]);
});

test("the Checkout email claims a paid order on any account that signs in with it", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout(
    "guest-phone",
    [ids[0]],
    requestId,
  );
  await f.event({
    id: "evt_paid",
    type: "completed",
    session: { ...f.paid(orderId), email: "buyer@example.com" },
  });
  assert.deepEqual((await f.service.ownership("laptop")).presetIds, []);
  assert.deepEqual(
    (await f.service.ownership("other", "someone@example.com")).presetIds,
    [],
  );
  for (let visit = 0; visit < 2; visit++)
    assert.deepEqual(
      (await f.service.ownership("laptop", " Buyer@Example.com")).presetIds,
      [ids[0]],
    );
  await f.event({
    id: "evt_refund",
    type: "revoked",
    paymentIntentId: `pi_${orderId}`,
  });
  for (const user of ["guest-phone", "laptop"])
    assert.deepEqual(
      (await f.service.ownership(user, "buyer@example.com")).presetIds,
      [],
    );
});

test("a guest signing into an existing account hands over what it bought; a refund takes both copies", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("guest", [ids[0]], requestId);
  await f.event({
    id: "evt_paid",
    type: "completed",
    session: f.paid(orderId),
  });
  assert.deepEqual(await f.service.adoptGuest("member", "member"), {
    adopted: 0,
  });
  for (const adopted of [1, 0])
    assert.deepEqual(await f.service.adoptGuest("guest", "member"), {
      adopted,
    });
  assert.deepEqual((await f.service.ownership("member")).presetIds, [ids[0]]);
  await f.event({
    id: "evt_refund",
    type: "revoked",
    paymentIntentId: `pi_${orderId}`,
  });
  for (const user of ["guest", "member"])
    assert.deepEqual((await f.service.ownership(user)).presetIds, []);
  assert.deepEqual(await f.service.adoptGuest("guest", "later"), {
    adopted: 0,
  });
});

test("tax added on top of the quote, or carried inside it, still grants", async () => {
  for (const [tax, total] of [
    [38, 337],
    [33, 299],
  ]) {
    const f = fixture();
    const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
    await f.event({
      id: "evt_taxed",
      type: "completed",
      session: { ...f.paid(orderId), taxCents: tax, totalCents: total },
    });
    assert.deepEqual((await f.service.ownership("user-A")).presetIds, [ids[0]]);
  }
});

test("a checkout whose provider call failed releases its reservation an hour later", async () => {
  const f = fixture();
  const createCheckout = f.payments.createCheckout;
  f.payments.createCheckout = async () => {
    throw new Error("provider rejected the session");
  };
  await assert.rejects(
    f.service.checkout("user-A", ids.slice(0, 10), requestId),
  );
  f.payments.createCheckout = createCheckout;
  const now = Date.now;
  try {
    // Past Stripe's 30-minute minimum the attempt cannot open a session, but one it opened may still be live.
    Date.now = () => now() + 31 * 60000;
    await assert.rejects(
      f.service.checkout("user-A", ids.slice(0, 10), "replacement-request-001"),
      fails("checkout_attempt_expired"),
    );
    Date.now = () => now() + 61 * 60000;
    await assert.rejects(
      f.service.checkout("user-A", ids.slice(0, 10), requestId),
      fails("order_not_pending"),
    );
    const retry = await f.service.checkout(
      "user-A",
      ids.slice(0, 10),
      "replacement-request-002",
    );
    assert.ok(retry.url);
  } finally {
    Date.now = now;
  }
});

test("provider-confirmed expiration releases its reservation even before the expiration webhook arrives", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  f.sessions.set(orderId, {
    ...f.sessions.get(orderId)!,
    status: "expired",
    url: null,
  });
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], requestId),
    fails("checkout_unavailable"),
  );
  assert.equal(
    await f.store.transaction(
      async (tx) => (await tx.getOrder(orderId))?.status,
    ),
    "expired",
  );
  const replacement = await f.service.checkout(
    "user-A",
    ids.slice(0, 2),
    "replacement-after-expiry-001",
  );
  assert.notEqual(replacement.orderId, orderId);
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, []);
});

test("expired retrieval cannot downgrade a paid or revoked order committed while the provider is awaited", async () => {
  for (const revoked of [false, true]) {
    const f = fixture();
    const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
    const started = deferred();
    const release = deferred();
    f.payments.createCheckout = async () => {
      started.resolve();
      await release.promise;
      return { ...f.sessions.get(orderId)!, status: "expired", url: null };
    };
    const pending = f.service.checkout("user-A", [ids[0]], requestId);
    await started.promise;
    await f.event({
      id: "evt_paid_during_retrieval",
      type: "paid",
      session: f.paid(orderId),
    });
    if (revoked)
      await f.event({
        id: "evt_refunded_during_retrieval",
        type: "revoked",
        paymentIntentId: `pi_${orderId}`,
      });
    release.resolve();
    await assert.rejects(pending, fails("checkout_unavailable"));
    assert.equal(
      await f.store.transaction(
        async (tx) => (await tx.getOrder(orderId))?.status,
      ),
      revoked ? "revoked" : "paid",
    );
    assert.deepEqual(
      (await f.service.ownership("user-A")).presetIds,
      revoked ? [] : [ids[0]],
    );
  }
});

test("complete unpaid asynchronous sessions retain reservations until a verified terminal event", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  f.sessions.set(orderId, {
    ...f.sessions.get(orderId)!,
    status: "complete",
    paymentStatus: "unpaid",
    url: null,
  });
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], requestId),
    fails("checkout_unavailable"),
  );
  assert.equal(
    await f.store.transaction(
      async (tx) => (await tx.getOrder(orderId))?.status,
    ),
    "pending",
  );
  await assert.rejects(
    f.service.checkout(
      "user-A",
      ids.slice(0, 2),
      "pending-async-replacement-001",
    ),
    fails("checkout_in_progress"),
  );
});

test("ownership appearing while Checkout creation is awaited suppresses the returned URL", async () => {
  const f = fixture();
  const gateway = f.payments.createCheckout;
  const started = deferred();
  const release = deferred();
  f.payments.createCheckout = async (order) => {
    started.resolve();
    await release.promise;
    return gateway(order);
  };
  const pending = f.service.checkout("user-A", [ids[0]], requestId);
  await started.promise;
  await f.store.transaction((tx) =>
    tx.putEntitlement({
      userId: "user-A",
      presetId: ids[0],
      sourceId: "verified-other-source",
      kind: "reward",
      revoked: false,
    }),
  );
  release.resolve();
  await assert.rejects(pending, fails("already_owned"));
});

test("unpaid completion never grants; signed paid event grants once across duplicate events and sessions", async () => {
  const f = fixture();
  const { orderId, quote } = await f.service.checkout(
    "user-A",
    ids.slice(0, 2),
    requestId,
  );
  const paid = f.paid(orderId);
  await f.event({
    id: "evt_waiting",
    type: "completed",
    session: { ...paid, paymentStatus: "unpaid" },
  });
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, []);
  const event: PaymentEvent = { id: "evt_paid", type: "paid", session: paid };
  assert.deepEqual(await f.event(event), {
    duplicate: false,
    purchased: {
      orderId,
      userId: "user-A",
      presetIds: ids.slice(0, 2),
      totalCents: quote.totalCents,
    },
  });
  assert.deepEqual(await f.event(event), { duplicate: true });
  await f.event({ ...event, id: "evt_another_paid" });
  assert.deepEqual(
    (await f.service.ownership("user-A")).presetIds,
    ids.slice(0, 2),
  );
  assert.deepEqual((await f.service.ownership("user-B")).presetIds, []);
  assert.equal(
    await f.store.transaction(
      async (tx) => (await tx.entitlements("user-A")).length,
    ),
    2,
  );
  await assert.rejects(
    f.service.checkout("user-A", [ids[0]], "another-request-00001"),
    fails("already_owned"),
  );
  await assert.rejects(
    f.service.download("user-B", ids[0]),
    fails("not_owned"),
  );
  await assert.rejects(
    f.service.download("user-A", ids[0]),
    fails("delivery_not_configured"),
  );
});

test("late failed or expired snapshots do not erase a paid order", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  await f.event({ id: "evt_paid", type: "paid", session: f.paid(orderId) });
  await f.event({
    id: "evt_failed",
    type: "failed",
    session: { ...f.paid(orderId), paymentStatus: "unpaid" },
  });
  await f.event({
    id: "evt_expired",
    type: "expired",
    session: {
      ...f.paid(orderId),
      status: "expired",
      paymentStatus: "unpaid",
      paymentIntentId: null,
    },
  });
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, [ids[0]]);
  assert.equal(
    await f.store.transaction(
      async (tx) => (await tx.getOrder(orderId))?.paymentIntentId,
    ),
    `pi_${orderId}`,
  );
});

test("refund before or after paid event revokes and cannot be undone by reordered payment", async () => {
  for (const before of [true, false]) {
    const f = fixture();
    const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
    const paid: PaymentEvent = {
      id: "evt_paid",
      type: "paid",
      session: f.paid(orderId),
    };
    if (!before) await f.event(paid);
    await f.event({
      id: "evt_refund",
      type: "revoked",
      paymentIntentId: `pi_${orderId}`,
    });
    await f.event(paid);
    await f.event({ ...paid, id: "evt_late_paid" });
    assert.deepEqual((await f.service.ownership("user-A")).presetIds, []);
    assert.equal(
      await f.store.transaction(
        async (tx) => (await tx.getOrder(orderId))?.status,
      ),
      "revoked",
    );
    await assert.rejects(
      f.service.download("user-A", ids[0]),
      fails("not_owned"),
    );
  }
});

test("mismatched amounts/session and invalid signatures fail before ownership; failures do not consume event IDs", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  const session = f.paid(orderId);
  for (const mismatch of [
    { totalCents: 1 },
    { taxCents: 38, totalCents: 336 },
    { currency: "eur" },
    { id: "cs_test_other" },
    { subtotalCents: 1 },
    { discountCents: 1 },
  ]) {
    await assert.rejects(
      f.event({
        id: "evt_retry",
        type: "paid",
        session: { ...session, ...mismatch },
      }),
      fails("payment_mismatch"),
    );
    assert.equal(
      await f.store.transaction((tx) => tx.eventSeen("evt_retry")),
      false,
    );
  }
  await assert.rejects(
    f.service.webhook("unaltered-body", "forged"),
    fails("invalid_webhook_signature"),
  );
  await f.event({ id: "evt_retry", type: "paid", session });
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, [ids[0]]);
});

test("transaction rollback includes the event marker and grants", async () => {
  const store = makeStore();
  await assert.rejects(
    store.transaction(async (tx) => {
      await tx.recordEvent("evt_atomic");
      await tx.putEntitlement({
        userId: "user-A",
        presetId: ids[0],
        sourceId: "fixture",
        kind: "order",
        revoked: false,
      });
      throw new Error("database failure");
    }),
  );
  assert.equal(
    await store.transaction((tx) => tx.eventSeen("evt_atomic")),
    false,
  );
  assert.deepEqual(
    await store.transaction((tx) => tx.entitlements("user-A")),
    [],
  );
});

test("a fulfillment write failure rolls back the paid order and retries the whole event", async () => {
  const backing = makeStore();
  let failGrant = false;
  const store: CommerceStore = {
    durability: backing.durability,
    transaction: (work) =>
      backing.transaction((tx) =>
        work({
          ...tx,
          async putEntitlement(entitlement) {
            await tx.putEntitlement(entitlement);
            if (failGrant) throw new Error("fixture interrupted fulfillment");
          },
        }),
      ),
  };
  const f = fixture(store);
  const { orderId } = await f.service.checkout(
    "user-A",
    ids.slice(0, 2),
    requestId,
  );
  const event: PaymentEvent = {
    id: "evt_write_retry",
    type: "paid",
    session: f.paid(orderId),
  };
  failGrant = true;
  await assert.rejects(f.event(event), /fixture interrupted fulfillment/);
  assert.equal(
    await backing.transaction(
      async (tx) => (await tx.getOrder(orderId))?.status,
    ),
    "pending",
  );
  assert.equal(
    await backing.transaction((tx) => tx.eventSeen(event.id)),
    false,
  );
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, []);
  failGrant = false;
  await f.event(event);
  assert.deepEqual(
    (await f.service.ownership("user-A")).presetIds,
    ids.slice(0, 2),
  );
  assert.deepEqual(await f.event(event), { duplicate: true });
});

test("repurchase after refund uses a new source that an old refund replay cannot revoke", async () => {
  const f = fixture();
  const first = await f.service.checkout("user-A", [ids[0]], requestId);
  await f.event({
    id: "evt_first_paid",
    type: "paid",
    session: f.paid(first.orderId),
  });
  await f.event({
    id: "evt_first_refund",
    type: "revoked",
    paymentIntentId: `pi_${first.orderId}`,
  });
  const second = await f.service.checkout(
    "user-A",
    [ids[0]],
    "repurchase-request-0001",
  );
  assert.notEqual(first.orderId, second.orderId);
  await f.event({
    id: "evt_second_paid",
    type: "paid",
    session: f.paid(second.orderId),
  });
  await f.event({
    id: "evt_old_refund_late",
    type: "revoked",
    paymentIntentId: `pi_${first.orderId}`,
  });
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, [ids[0]]);
  assert.equal(
    await f.store.transaction(
      async (tx) => (await tx.getOrder(second.orderId))?.status,
    ),
    "paid",
  );
});

test("one reward per account and campaign; duplicate claims are serialized", async () => {
  const store = new MemoryCommerceStore();
  const f = fixture(store);
  const service = createCommerceService({
    store,
    payments: f.payments,
    policy: {
      presetIds: ids,
      reward: { campaignId: "campaign", eligiblePresetIds: ids },
    },
  });
  const claimed = await Promise.all([
    service.claimReward("eligible"),
    service.claimReward("eligible"),
  ]);
  assert.deepEqual(claimed[0], claimed[1]);
  assert.ok(ids.includes(claimed[0].presetId));
  assert.deepEqual(await service.claimReward("eligible"), claimed[0]);
  assert.deepEqual((await service.ownership("eligible")).presetIds, [
    claimed[0].presetId,
  ]);
  // Ownership reports the claim, so a later visit shows it as claimed.
  assert.equal(
    (await service.ownership("eligible")).rewardPresetId,
    claimed[0].presetId,
  );
  assert.equal((await service.ownership("someone-else")).rewardPresetId, null);
  assert.equal(
    await store.transaction(
      async (tx) => (await tx.entitlements("eligible")).length,
    ),
    1,
  );
  await assert.rejects(
    f.service.claimReward("eligible"),
    fails("reward_not_configured"),
  );
});

test("the reward draw skips presets the account owns and fails once it owns them all", async () => {
  const store = new MemoryCommerceStore();
  const f = fixture(store);
  const service = createCommerceService({
    store,
    payments: f.payments,
    policy: {
      presetIds: ids,
      reward: { campaignId: "campaign", eligiblePresetIds: ids.slice(0, 2) },
    },
  });
  const own = (userId: string, presetId: string) =>
    store.transaction((tx) =>
      tx.putEntitlement({
        userId,
        presetId,
        sourceId: `order:${userId}:${presetId}`,
        kind: "order",
        revoked: false,
      }),
    );
  await own("one-left", ids[0]);
  await own("owns-all", ids[0]);
  await own("owns-all", ids[1]);
  assert.equal((await service.claimReward("one-left")).presetId, ids[1]);
  await assert.rejects(
    service.claimReward("owns-all"),
    fails("reward_unavailable"),
  );
});

test("download adapter is called only for an owned preset and fixed sixty-second expiry", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  await f.event({ id: "evt_paid", type: "paid", session: f.paid(orderId) });
  const calls: unknown[] = [];
  const service = createCommerceService({
    policy: { presetIds: ids },
    store: f.store,
    payments: f.payments,
    delivery: {
      allowedOrigins: ["https://private-files.example"],
      async issueDownload(input) {
        calls.push(input);
        return "https://private-files.example/short-lived-fixture";
      },
    },
  });
  await assert.rejects(service.download("user-B", ids[0]), fails("not_owned"));
  assert.equal(calls.length, 0);
  assert.equal((await service.download("user-A", ids[0])).expiresInSeconds, 60);
  assert.deepEqual(calls[0], {
    userId: "user-A",
    presetId: ids[0],
    sourceId: orderId,
    expiresInSeconds: 60,
  });
});

test("Supabase delivery signs the private preset file with its catalog name, only for an owner", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  await f.event({ id: "evt_paid", type: "paid", session: f.paid(orderId) });
  const calls: unknown[] = [];
  const client: StorageClient = {
    storage: {
      from(bucket) {
        return {
          async createSignedUrl(path, expiresIn, options) {
            calls.push({ bucket, path, expiresIn, options });
            return {
              data: {
                signedUrl: `https://fixture.supabase.co/storage/v1/object/sign/${bucket}/${path}?token=fixture&download=${encodeURIComponent(options.download)}`,
              },
              error: null,
            };
          },
        };
      },
    },
  };
  const delivery = createSupabaseDelivery(
    client,
    "https://fixture.supabase.co",
  );
  assert.deepEqual(delivery.allowedOrigins, ["https://fixture.supabase.co"]);
  const service = createCommerceService({
    policy: { presetIds: ids },
    store: f.store,
    payments: f.payments,
    delivery,
  });
  await assert.rejects(service.download("user-B", ids[0]), fails("not_owned"));
  assert.equal(calls.length, 0);
  const { url } = await service.download("user-A", ids[0]);
  const name = `${presetCatalog[0].name}.xmp`;
  assert.equal(new URL(url).origin, "https://fixture.supabase.co");
  assert.equal(new URL(url).searchParams.get("download"), name);
  assert.deepEqual(calls, [
    {
      bucket: "preset-files",
      path: `${ids[0]}.xmp`,
      expiresIn: 60,
      options: { download: name },
    },
  ]);

  const failing = createSupabaseDelivery(
    {
      storage: {
        from: () => ({
          createSignedUrl: async () => ({ data: null, error: new Error("x") }),
        }),
      },
    },
    "https://fixture.supabase.co",
  );
  await assert.rejects(
    failing.issueDownload({
      userId: "user-A",
      presetId: ids[0],
      sourceId: orderId,
      expiresInSeconds: 60,
    }),
    fails("delivery_unavailable"),
  );
});

test("refund committed while the signer is awaited suppresses the signed download URL", async () => {
  const f = fixture();
  const { orderId } = await f.service.checkout("user-A", [ids[0]], requestId);
  await f.event({ id: "evt_paid", type: "paid", session: f.paid(orderId) });
  const started = deferred();
  const release = deferred();
  const service = createCommerceService({
    policy: { presetIds: ids },
    store: f.store,
    payments: f.payments,
    delivery: {
      allowedOrigins: ["https://private-files.example"],
      async issueDownload() {
        started.resolve();
        await release.promise;
        return "https://private-files.example/should-not-be-exposed";
      },
    },
  });
  const pending = service.download("user-A", ids[0]);
  await started.promise;
  await f.event({
    id: "evt_refund",
    type: "revoked",
    paymentIntentId: `pi_${orderId}`,
  });
  release.resolve();
  await assert.rejects(pending, fails("not_owned"));
});

test("a legacy order credits the pack to its confirmed email account once; guests and other emails get nothing", async () => {
  const store = makeStore();
  const f = fixture(store);
  const service = createCommerceService({
    store,
    payments: f.payments,
    policy: { presetIds: ids, legacyPackPresetIds },
  });
  const rows = async (userId: string) =>
    store.transaction(async (tx) => (await tx.entitlements(userId)).length);
  const orders = parseLegacyOrders(
    readFileSync(new URL("support/legacy-orders.csv", import.meta.url), "utf8"),
  );
  assert.deepEqual(orders, [
    {
      orderId: "00000000-0000-4000-8000-000000000001",
      email: "buyer@example.test",
    },
    {
      orderId: "00000000-0000-4000-8000-000000000002",
      email: "two@example.test",
    },
  ]);
  await syncLegacyOrders(store, orders, [], legacyPackPresetIds);

  assert.equal(legacyPackPresetIds.length, 9);
  assert.deepEqual(
    (await service.ownership("buyer", "Buyer@Example.test")).presetIds.sort(),
    [...legacyPackPresetIds].sort(),
  );
  assert.equal(await rows("buyer"), 9);
  await service.ownership("buyer", "buyer@example.test");
  assert.equal(await rows("buyer"), 9);
  assert.deepEqual((await service.ownership("guest")).presetIds, []);
  assert.deepEqual(
    (await service.ownership("other", "other@example.test")).presetIds,
    [],
  );
  assert.equal(await rows("guest"), 0);
  assert.equal(await rows("other"), 0);
});

test("a legacy sync grants existing accounts, changes nothing on re-run, and revokes dropped orders", async () => {
  const store = makeStore();
  const f = fixture(store);
  const service = createCommerceService({
    store,
    payments: f.payments,
    policy: { presetIds: ids, legacyPackPresetIds },
  });
  const one = { orderId: "ls-1", email: "one@example.test" };
  const two = { orderId: "ls-2", email: "two@example.test" };
  const accounts = [
    { userId: "one", email: one.email },
    { userId: "two", email: two.email },
  ];
  const sync = (orders: { orderId: string; email: string }[]) =>
    syncLegacyOrders(store, orders, accounts, legacyPackPresetIds);
  assert.deepEqual(await sync([one, two]), { kept: 2, removed: 0, granted: 2 });
  assert.deepEqual(await sync([one, two]), { kept: 2, removed: 0, granted: 0 });
  assert.equal((await service.ownership("two", two.email)).presetIds.length, 9);

  assert.deepEqual(await sync([one]), { kept: 1, removed: 1, granted: 0 });
  assert.deepEqual((await service.ownership("two", two.email)).presetIds, []);
  assert.equal((await service.ownership("one", one.email)).presetIds.length, 9);
});

test("the legacy order import refuses a file without its columns or orders", () => {
  assert.throws(() => parseLegacyOrders("id,email\nx,y@z.test\n"));
  assert.throws(() => parseLegacyOrders("identifier,user_email\n"));
});

test("ownership leaves out entitlements outside the catalog", async () => {
  const f = fixture();
  await f.store.transaction(async (tx) => {
    for (const presetId of [ids[0], "retired-preset"])
      await tx.putEntitlement({
        userId: "user-A",
        presetId,
        sourceId: "fixture",
        kind: "order",
        revoked: false,
      });
  });
  assert.deepEqual((await f.service.ownership("user-A")).presetIds, [ids[0]]);
});
