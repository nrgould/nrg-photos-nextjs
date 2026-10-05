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
  type Order,
  type PaymentEvent,
  type PaymentGateway,
} from "../src/lib/server/commerce/types";
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
  const payments: PaymentGateway = {
    async createCheckout(order) {
      created.push(order);
      if (!sessions.has(order.id))
        sessions.set(order.id, {
          id: `cs_test_${order.id}`,
          url: "https://checkout.stripe.com/c/pay/fixture",
          orderId: order.id,
          paymentIntentId: null,
          status: "open",
          paymentStatus: "unpaid",
          subtotalCents: order.subtotalCents,
          discountCents: order.discountCents,
          totalCents: order.totalCents,
          currency: "usd",
        });
      return structuredClone(sessions.get(order.id)!);
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
    [1, 0, 199],
    [9, 0, 1791],
    [10, 398, 1592],
    [11, 438, 1751],
    [28, 1114, 4458],
  ]) {
    const quote = quotePresets(ids.slice(0, count), ids);
    assert.equal(quote.discountCents, discount);
    assert.equal(quote.totalCents, total);
  }
  assert.equal(quotePresets(Array(10).fill(ids[0]), ids).totalCents, 199);
  for (const input of [
    [],
    null,
    ["alpine-soft"],
    [ids[0], "unknown"],
    Array(101).fill(ids[0]),
  ])
    assert.throws(() => quotePresets(input, ids), CommerceError);
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

test("verified expiration releases a pending reservation; an open overlapping session does not", async () => {
  const f = fixture();
  const first = await f.service.checkout("user-A", [ids[0]], requestId);
  await assert.rejects(
    f.service.checkout("user-A", ids.slice(0, 2), "replacement-request-001"),
    fails("checkout_in_progress"),
  );
  await f.event({
    id: "evt_expired",
    type: "expired",
    session: { ...f.sessions.get(first.orderId)!, status: "expired" },
  });
  const second = await f.service.checkout(
    "user-A",
    ids.slice(0, 2),
    "replacement-request-001",
  );
  assert.notEqual(second.orderId, first.orderId);
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
  const { orderId } = await f.service.checkout(
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
  assert.deepEqual(await f.event(event), { duplicate: false });
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
