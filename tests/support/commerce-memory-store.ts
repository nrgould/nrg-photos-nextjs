import {
  CommerceError,
  type CommerceStore,
  type CommerceTransaction,
  type Entitlement,
  type Order,
  type RewardClaim,
} from "../../src/lib/server/commerce/types";

type State = {
  orders: Map<string, Order>;
  requests: Map<string, string>;
  events: Set<string>;
  revokedPayments: Set<string>;
  entitlements: Map<string, Entitlement>;
  claims: Map<string, RewardClaim>;
  verified: Map<string, string[]>;
};
const key = (...parts: string[]) => JSON.stringify(parts);

/** Test fixture only. Not an application fallback and deliberately outside src/. */
export class MemoryCommerceStore implements CommerceStore {
  readonly durability = "test-only" as const;
  private tail: Promise<void> = Promise.resolve();
  private state: State = {
    orders: new Map(),
    requests: new Map(),
    events: new Set(),
    revokedPayments: new Set(),
    entitlements: new Map(),
    claims: new Map(),
    verified: new Map(),
  };
  constructor(
    verified: {
      userId: string;
      campaignId: string;
      locationIds: string[];
    }[] = [],
  ) {
    for (const row of verified)
      this.state.verified.set(key(row.userId, row.campaignId), [
        ...row.locationIds,
      ]);
  }
  async transaction<T>(
    work: (tx: CommerceTransaction) => Promise<T>,
  ): Promise<T> {
    const prior = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await prior;
    const next: State = structuredClone(this.state);
    const tx: CommerceTransaction = {
      getOrder: async (id) => structuredClone(next.orders.get(id) ?? null),
      checkoutRequest: async (requestKey) =>
        next.requests.get(requestKey) ?? null,
      bindCheckoutRequest: async (requestKey, orderId) => {
        const prior = next.requests.get(requestKey);
        if (prior && prior !== orderId)
          throw new CommerceError("request_id_reused", 409);
        next.requests.set(requestKey, orderId);
      },
      pendingOrdersForPresets: async (userId, presetIds) =>
        structuredClone(
          [...next.orders.values()].filter(
            (order) =>
              order.userId === userId &&
              order.status === "pending" &&
              order.presetIds.some((id) => presetIds.includes(id)),
          ),
        ),
      putOrder: async (order) => {
        for (const other of next.orders.values()) {
          if (
            other.id !== order.id &&
            other.userId === order.userId &&
            other.status === "pending" &&
            order.status === "pending" &&
            other.presetIds.some((id) => order.presetIds.includes(id))
          )
            throw new CommerceError("checkout_in_progress", 409);
          if (
            other.id !== order.id &&
            ((order.sessionId && other.sessionId === order.sessionId) ||
              (order.paymentIntentId &&
                other.paymentIntentId === order.paymentIntentId))
          )
            throw new CommerceError("order_identity_conflict", 409);
        }
        next.orders.set(order.id, structuredClone(order));
      },
      eventSeen: async (id) => next.events.has(id),
      recordEvent: async (id) => {
        next.events.add(id);
      },
      paymentRevoked: async (id) => next.revokedPayments.has(id),
      revokePayment: async (id) => {
        next.revokedPayments.add(id);
      },
      ordersForPayment: async (id) =>
        structuredClone(
          [...next.orders.values()].filter(
            (order) => order.paymentIntentId === id,
          ),
        ),
      entitlements: async (userId) =>
        structuredClone(
          [...next.entitlements.values()].filter(
            (entry) => entry.userId === userId,
          ),
        ),
      putEntitlement: async (entry) => {
        next.entitlements.set(
          key(entry.userId, entry.presetId, entry.sourceId),
          structuredClone(entry),
        );
      },
      revokeOrderEntitlements: async (orderId) => {
        for (const [id, entry] of next.entitlements)
          if (entry.kind === "order" && entry.sourceId === orderId)
            next.entitlements.set(id, { ...entry, revoked: true });
      },
      rewardClaim: async (userId, campaignId) =>
        structuredClone(next.claims.get(key(userId, campaignId)) ?? null),
      putRewardClaim: async (claim) => {
        const id = key(claim.userId, claim.campaignId);
        if (next.claims.has(id))
          throw new CommerceError("reward_already_claimed", 409);
        next.claims.set(id, structuredClone(claim));
      },
      verifiedLocations: async (userId, campaignId) => [
        ...(next.verified.get(key(userId, campaignId)) ?? []),
      ],
    };
    try {
      const result = await work(tx);
      this.state = next;
      return result;
    } finally {
      release();
    }
  }
}
