import { createHash, randomInt } from "node:crypto";
import { normalizeCommerceReturnPath } from "./return-path";
import { getCatalogPreset } from "../../preset-commerce";
import {
  CommerceError,
  type CheckoutSession,
  type CommercePolicy,
  type CommerceStore,
  type CommerceTransaction,
  type LegacyOrder,
  type Order,
  type PaymentEvent,
  type PaymentGateway,
  type PrivateDelivery,
  type Quote,
} from "./types";

export function quotePresets(ids: unknown, allowed: readonly string[]): Quote {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100)
    throw new CommerceError("invalid_cart");
  if (ids.some((id) => typeof id !== "string" || !allowed.includes(id)))
    throw new CommerceError("unknown_preset");
  const presetIds = [...new Set<string>(ids)].sort();
  const subtotalCents = presetIds.length * 199;
  const discountCents =
    presetIds.length >= 10 ? Math.floor((subtotalCents * 20 + 50) / 100) : 0;
  return {
    presetIds,
    subtotalCents,
    discountCents,
    totalCents: subtotalCents - discountCents,
    currency: "usd",
  };
}

function assertSession(order: Order, session: CheckoutSession) {
  if (
    session.orderId !== order.id ||
    // The gateway already matched livemode to the configured mode.
    !/^cs_(test|live)_/.test(session.id) ||
    (order.sessionId !== null && order.sessionId !== session.id) ||
    (order.paymentIntentId !== null &&
      session.paymentIntentId !== null &&
      order.paymentIntentId !== session.paymentIntentId) ||
    session.currency !== "usd" ||
    session.subtotalCents !== order.subtotalCents ||
    session.discountCents !== order.discountCents ||
    // Tax-exclusive prices add the tax; tax-inclusive ones carry it inside the total.
    (session.totalCents !== order.totalCents &&
      session.totalCents !== order.totalCents + session.taxCents)
  )
    throw new CommerceError("payment_mismatch", 409);
}

const legacySource = (orderId: string) => `lemonsqueezy:${orderId}`;
const legacySources = async (
  tx: CommerceTransaction,
  email: string,
  presetIds: readonly string[],
) =>
  (await tx.legacyOrders(email.trim().toLowerCase())).map((orderId) => ({
    sourceId: legacySource(orderId),
    presetIds,
  }));

/** Grants each source's presets once to this account; returns the rows added. */
async function grantSources(
  tx: CommerceTransaction,
  userId: string,
  sources: readonly { sourceId: string; presetIds: readonly string[] }[],
) {
  const active = new Set(
    (await tx.entitlements(userId))
      .filter((entry) => !entry.revoked)
      .map((entry) => JSON.stringify([entry.presetId, entry.sourceId])),
  );
  let added = 0;
  for (const { sourceId, presetIds } of sources)
    for (const presetId of presetIds) {
      if (active.has(JSON.stringify([presetId, sourceId]))) continue;
      await tx.putEntitlement({
        userId,
        presetId,
        sourceId,
        kind: "order",
        revoked: false,
      });
      added++;
    }
  return added;
}

/**
 * Makes the stored legacy orders exactly `orders`, revokes the grants of removed ones,
 * and grants to `accounts` (confirmed email accounts) right away.
 */
export async function syncLegacyOrders(
  store: CommerceStore,
  orders: readonly LegacyOrder[],
  accounts: readonly { userId: string; email: string }[],
  presetIds: readonly string[],
) {
  return store.transaction(async (tx) => {
    const removed = await tx.replaceLegacyOrders(orders);
    for (const orderId of removed)
      await tx.revokeOrderEntitlements(legacySource(orderId));
    let granted = 0;
    for (const account of accounts)
      if (
        await grantSources(
          tx,
          account.userId,
          await legacySources(tx, account.email, presetIds),
        )
      )
        granted++;
    return { kept: orders.length, removed: removed.length, granted };
  });
}

export function createCommerceService({
  policy,
  store,
  payments,
  delivery,
}: {
  policy: CommercePolicy;
  store: CommerceStore;
  payments: PaymentGateway;
  delivery?: PrivateDelivery;
}) {
  const allowed = Object.freeze([...new Set(policy.presetIds)]);
  if (!allowed.length || allowed.some((id) => !getCatalogPreset(id)))
    throw new CommerceError("invalid_server_catalog", 503);
  const reward = policy.reward
    ? {
        campaignId: policy.reward.campaignId,
        eligiblePresetIds: [...new Set(policy.reward.eligiblePresetIds)],
      }
    : null;
  const legacyPack = (policy.legacyPackPresetIds ?? []).filter((id) =>
    allowed.includes(id),
  );

  async function assertUnowned(
    tx: CommerceTransaction,
    userId: string,
    presetIds: readonly string[],
  ) {
    const owned = (await tx.entitlements(userId)).filter(
      (entry) => !entry.revoked,
    );
    if (
      presetIds.some((presetId) =>
        owned.some((entry) => entry.presetId === presetId),
      )
    )
      throw new CommerceError("already_owned", 409);
  }

  async function checkout(
    userId: string,
    ids: unknown,
    requestId: unknown,
    returnPath: unknown = "/",
  ) {
    if (!userId) throw new CommerceError("unauthenticated", 401);
    if (
      typeof requestId !== "string" ||
      !/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)
    )
      throw new CommerceError("invalid_request_id");
    const approvedReturnPath = normalizeCommerceReturnPath(returnPath);
    const quote = quotePresets(ids, allowed);
    const id = createHash("sha256")
      .update(JSON.stringify([userId, requestId]))
      .digest("hex");
    const order = await store.transaction(async (tx) => {
      await assertUnowned(tx, userId, quote.presetIds);
      // A failed Stripe call leaves a pending order with no session. Any session it could
      // have opened expires an hour after creation, so after that the reservation is released.
      for (const stale of await tx.pendingOrdersForPresets(
        userId,
        quote.presetIds,
      ))
        if (!stale.sessionId && Date.now() - stale.createdAt > 3600000)
          await tx.putOrder({ ...stale, status: "expired" });
      const boundId = await tx.checkoutRequest(id);
      const existing = boundId ? await tx.getOrder(boundId) : null;
      if (boundId && !existing) throw new CommerceError("order_missing", 409);
      if (existing) {
        if (
          JSON.stringify(existing.presetIds) !==
            JSON.stringify(quote.presetIds) ||
          existing.returnPath !== approvedReturnPath
        )
          throw new CommerceError("request_id_reused", 409);
        if (existing.status !== "pending")
          throw new CommerceError("order_not_pending", 409);
        if (!existing.sessionId && Date.now() - existing.createdAt > 1800000)
          throw new CommerceError("checkout_attempt_expired", 409);
        return existing;
      }
      const pending = await tx.pendingOrdersForPresets(userId, quote.presetIds);
      if (pending.length) {
        const prior = pending[0];
        if (
          pending.length !== 1 ||
          prior.returnPath !== approvedReturnPath ||
          JSON.stringify(prior.presetIds) !== JSON.stringify(quote.presetIds)
        )
          throw new CommerceError("checkout_in_progress", 409);
        if (!prior.sessionId && Date.now() - prior.createdAt > 1800000)
          throw new CommerceError("checkout_attempt_expired", 409);
        await tx.bindCheckoutRequest(id, prior.id);
        return prior;
      }
      const next: Order = {
        ...quote,
        id,
        userId,
        createdAt: Date.now(),
        returnPath: approvedReturnPath,
        sessionId: null,
        paymentIntentId: null,
        status: "pending",
        email: null,
      };
      await tx.putOrder(next);
      await tx.bindCheckoutRequest(id, next.id);
      return next;
    });
    // The gateway uses the persistent order ID as Stripe's idempotency key.
    const session = await payments.createCheckout(order);
    assertSession(order, session);
    if (session.status === "expired" && session.paymentStatus === "unpaid") {
      await store.transaction(async (tx) => {
        const current = await tx.getOrder(order.id);
        if (!current) throw new CommerceError("order_missing", 409);
        assertSession(current, session);
        if (current.status !== "pending") return;
        const paymentIntentId =
          session.paymentIntentId ?? current.paymentIntentId;
        await tx.putOrder({
          ...current,
          sessionId: session.id,
          paymentIntentId,
          status:
            paymentIntentId && (await tx.paymentRevoked(paymentIntentId))
              ? "revoked"
              : "expired",
        });
      });
      // Commit the verified terminal state before telling the client to start a fresh attempt.
      throw new CommerceError("checkout_unavailable", 409);
    }
    if (session.status !== "open" || !session.url)
      throw new CommerceError("checkout_unavailable", 409);
    const url = new URL(session.url);
    if (url.origin !== "https://checkout.stripe.com")
      throw new CommerceError("invalid_checkout_url", 502);
    await store.transaction(async (tx) => {
      await assertUnowned(tx, userId, quote.presetIds);
      const current = await tx.getOrder(order.id);
      if (!current) throw new CommerceError("order_missing", 409);
      assertSession(current, session);
      if (current.status !== "pending")
        throw new CommerceError("order_not_pending", 409);
      await tx.putOrder({
        ...current,
        sessionId: session.id,
        paymentIntentId: session.paymentIntentId ?? current.paymentIntentId,
      });
    });
    return { orderId: order.id, url: session.url, quote };
  }

  async function applyEvent(event: PaymentEvent) {
    return store.transaction(async (tx) => {
      if (await tx.eventSeen(event.id)) return { duplicate: true };
      if (event.type === "revoked") {
        // A refund arriving before payment leaves a tombstone for the later event.
        await tx.revokePayment(event.paymentIntentId);
        for (const order of await tx.ordersForPayment(event.paymentIntentId)) {
          await tx.putOrder({ ...order, status: "revoked" });
          await tx.revokeOrderEntitlements(order.id);
        }
      } else if (event.type !== "ignored") {
        const session = event.session;
        const order = await tx.getOrder(session.orderId);
        if (!order) throw new CommerceError("unknown_order", 409);
        assertSession(order, session);
        const paymentIntentId =
          session.paymentIntentId ?? order.paymentIntentId;
        let status = order.status;
        if (paymentIntentId && (await tx.paymentRevoked(paymentIntentId)))
          status = "revoked";
        else if (status !== "revoked") {
          if (
            (event.type === "paid" || event.type === "completed") &&
            session.paymentStatus === "paid" &&
            session.status === "complete"
          ) {
            if (!session.paymentIntentId)
              throw new CommerceError("missing_payment_intent", 409);
            status = "paid";
          } else if (status !== "paid" && event.type === "failed")
            status = "failed";
          else if (status !== "paid" && event.type === "expired")
            status = "expired";
        }
        const next: Order = {
          ...order,
          sessionId: session.id,
          paymentIntentId,
          status,
          email: session.email ?? order.email,
        };
        await tx.putOrder(next);
        if (status === "paid") {
          for (const presetId of order.presetIds)
            await tx.putEntitlement({
              userId: order.userId,
              presetId,
              sourceId: order.id,
              kind: "order",
              revoked: false,
            });
        } else if (status === "revoked")
          await tx.revokeOrderEntitlements(order.id);
      }
      await tx.recordEvent(event.id);
      return { duplicate: false };
    });
  }

  return {
    checkout,
    async webhook(rawBody: string, signature: string) {
      return applyEvent(payments.verifyWebhook(rawBody, signature));
    },
    /** `email` is the session's confirmed email, null for guests. */
    async ownership(userId: string, email: string | null = null) {
      if (!userId) throw new CommerceError("unauthenticated", 401);
      return store.transaction(async (tx) => {
        // A confirmed email claims the 2025 pack and every order paid with it at Checkout,
        // whichever device bought it. Refunds revoke by order, so claimed copies go too.
        if (email)
          await grantSources(tx, userId, [
            ...(legacyPack.length
              ? await legacySources(tx, email, legacyPack)
              : []),
            ...(await tx.paidOrdersForEmail(email.trim().toLowerCase())).map(
              (order) => ({
                sourceId: order.id,
                presetIds: order.presetIds,
              }),
            ),
          ]);
        return {
          status: "verified" as const,
          presetIds: [
            ...new Set(
              (await tx.entitlements(userId))
                .filter((e) => !e.revoked)
                .map((e) => e.presetId),
            ),
          ],
          // So a claimed reward stays claimed across visits.
          rewardPresetId: reward
            ? ((await tx.rewardClaim(userId, reward.campaignId))?.presetId ??
              null)
            : null,
        };
      });
    },
    /**
     * One free preset per account and campaign, drawn at random from the eligible ones it doesn't own.
     * Challenges live in the browser, so the gate is the caller's: a confirmed email account.
     */
    async claimReward(userId: string) {
      if (!userId) throw new CommerceError("unauthenticated", 401);
      if (!reward) throw new CommerceError("reward_not_configured", 503);
      return store.transaction(async (tx) => {
        const prior = await tx.rewardClaim(userId, reward.campaignId);
        if (prior) return prior;
        const owned = new Set(
          (await tx.entitlements(userId))
            .filter((e) => !e.revoked)
            .map((e) => e.presetId),
        );
        const candidates = reward.eligiblePresetIds.filter(
          (id) => allowed.includes(id) && !owned.has(id),
        );
        const reserved = new Set(
          (await tx.pendingOrdersForPresets(userId, candidates)).flatMap(
            (order) => order.presetIds,
          ),
        );
        const pool = candidates.filter((id) => !reserved.has(id));
        if (!pool.length) throw new CommerceError("reward_unavailable", 409);
        const claim = {
          userId,
          campaignId: reward.campaignId,
          presetId: pool[randomInt(pool.length)],
        };
        await tx.putRewardClaim(claim);
        await tx.putEntitlement({
          userId,
          presetId: claim.presetId,
          sourceId: `reward:${reward.campaignId}:${userId}`,
          kind: "reward",
          revoked: false,
        });
        return claim;
      });
    },
    async download(userId: string, presetId: string) {
      if (!userId) throw new CommerceError("unauthenticated", 401);
      if (!allowed.includes(presetId))
        throw new CommerceError("unknown_preset", 404);
      const entitlement = await store.transaction(async (tx) =>
        (await tx.entitlements(userId)).find(
          (entry) => entry.presetId === presetId && !entry.revoked,
        ),
      );
      if (!entitlement) throw new CommerceError("not_owned", 403);
      if (!delivery) throw new CommerceError("delivery_not_configured", 503);
      const url = await delivery.issueDownload({
        userId,
        presetId,
        sourceId: entitlement.sourceId,
        expiresInSeconds: 60,
      });
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        !delivery.allowedOrigins.includes(parsed.origin)
      )
        throw new CommerceError("invalid_delivery_url", 502);
      const stillOwned = await store.transaction(async (tx) =>
        (await tx.entitlements(userId)).some(
          (entry) =>
            entry.presetId === presetId &&
            entry.sourceId === entitlement.sourceId &&
            entry.kind === entitlement.kind &&
            !entry.revoked,
        ),
      );
      if (!stillOwned) throw new CommerceError("not_owned", 403);
      return { url, expiresInSeconds: 60 };
    },
  };
}
export type CommerceService = ReturnType<typeof createCommerceService>;
