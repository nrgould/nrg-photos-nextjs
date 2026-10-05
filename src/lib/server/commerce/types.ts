export class CommerceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
  ) {
    super(code);
  }
}

export type Quote = {
  presetIds: string[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: "usd";
};
export type Order = Quote & {
  id: string;
  userId: string;
  createdAt: number;
  /** Canonical relative path validated by normalizeCommerceReturnPath. */
  returnPath: string;
  sessionId: string | null;
  paymentIntentId: string | null;
  status: "pending" | "paid" | "failed" | "expired" | "revoked";
};
export type Entitlement = {
  userId: string;
  presetId: string;
  sourceId: string;
  kind: "order" | "reward";
  revoked: boolean;
};
export type RewardClaim = {
  userId: string;
  campaignId: string;
  presetId: string;
};

/** Implement with a database transaction and uniqueness constraints, not read/write files. */
export interface CommerceTransaction {
  getOrder(id: string): Promise<Order | null>;
  checkoutRequest(requestKey: string): Promise<string | null>;
  /** Immutable unique request key -> order ID alias, committed with reservations. */
  bindCheckoutRequest(requestKey: string, orderId: string): Promise<void>;
  pendingOrdersForPresets(
    userId: string,
    presetIds: readonly string[],
  ): Promise<Order[]>;
  /** Atomically maintain unique pending (userId,presetId) reservations with status changes. */
  putOrder(order: Order): Promise<void>;
  eventSeen(id: string): Promise<boolean>;
  recordEvent(id: string): Promise<void>;
  paymentRevoked(paymentIntentId: string): Promise<boolean>;
  revokePayment(paymentIntentId: string): Promise<void>;
  ordersForPayment(paymentIntentId: string): Promise<Order[]>;
  entitlements(userId: string): Promise<Entitlement[]>;
  putEntitlement(entitlement: Entitlement): Promise<void>;
  revokeOrderEntitlements(orderId: string): Promise<void>;
  rewardClaim(userId: string, campaignId: string): Promise<RewardClaim | null>;
  putRewardClaim(claim: RewardClaim): Promise<void>;
  /** Lemon Squeezy order IDs bought with this lowercased email. */
  legacyOrders(email: string): Promise<string[]>;
  /** Make the stored legacy orders exactly these; returns the order IDs removed. */
  replaceLegacyOrders(orders: readonly LegacyOrder[]): Promise<string[]>;
}
export type LegacyOrder = { orderId: string; email: string };
export interface CommerceStore {
  readonly durability: "durable" | "test-only";
  /** Serializable isolation; rollback all writes on failure. */
  transaction<T>(work: (tx: CommerceTransaction) => Promise<T>): Promise<T>;
}
export type CheckoutSession = {
  id: string;
  url: string | null;
  orderId: string;
  paymentIntentId: string | null;
  status: "open" | "complete" | "expired";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
};
export type PaymentEvent =
  | {
      id: string;
      type: "completed" | "paid" | "failed" | "expired";
      session: CheckoutSession;
    }
  | { id: string; type: "revoked"; paymentIntentId: string }
  | { id: string; type: "ignored" };
export interface PaymentGateway {
  createCheckout(order: Order): Promise<CheckoutSession>;
  verifyWebhook(rawBody: string, signature: string): PaymentEvent;
}
export type CommercePolicy = {
  presetIds: readonly string[];
  reward?: {
    campaignId: string;
    eligiblePresetIds: readonly string[];
  };
  /** Granted to an email account for each legacy order bought with its email. */
  legacyPackPresetIds?: readonly string[];
};
export interface PrivateDelivery {
  readonly allowedOrigins: readonly string[];
  issueDownload(input: {
    userId: string;
    presetId: string;
    sourceId: string;
    expiresInSeconds: number;
  }): Promise<string>;
}
