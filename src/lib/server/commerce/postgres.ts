import type postgres from "postgres";
import {
  CommerceError,
  type CommerceStore,
  type CommerceTransaction,
  type Entitlement,
  type Order,
} from "./types";

type Tx = postgres.TransactionSql;
type OrderRow = {
  id: string;
  user_id: string;
  preset_ids: string[];
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: "usd";
  created_at: string;
  return_path: string;
  session_id: string | null;
  payment_intent_id: string | null;
  status: Order["status"];
};
const order = (row: OrderRow): Order => ({
  id: row.id,
  userId: row.user_id,
  presetIds: row.preset_ids,
  subtotalCents: row.subtotal_cents,
  discountCents: row.discount_cents,
  totalCents: row.total_cents,
  currency: row.currency,
  createdAt: Number(row.created_at),
  returnPath: row.return_path,
  sessionId: row.session_id,
  paymentIntentId: row.payment_intent_id,
  status: row.status,
});

function bind(sql: Tx): CommerceTransaction {
  return {
    async getOrder(id) {
      const [row] = await sql<OrderRow[]>`
        select * from commerce_orders where id = ${id}`;
      return row ? order(row) : null;
    },
    async checkoutRequest(requestKey) {
      const [row] = await sql<{ order_id: string }[]>`
        select order_id from commerce_checkout_requests where request_key = ${requestKey}`;
      return row?.order_id ?? null;
    },
    async bindCheckoutRequest(requestKey, orderId) {
      const [row] = await sql<{ order_id: string }[]>`
        insert into commerce_checkout_requests (request_key, order_id)
        values (${requestKey}, ${orderId})
        on conflict (request_key) do update set request_key = excluded.request_key
        returning order_id`;
      if (row.order_id !== orderId)
        throw new CommerceError("request_id_reused", 409);
    },
    async pendingOrdersForPresets(userId, presetIds) {
      const rows = await sql<OrderRow[]>`
        select * from commerce_orders
        where user_id = ${userId} and status = 'pending'
          and preset_ids && ${sql.array([...presetIds])}::text[]`;
      return rows.map(order);
    },
    async putOrder(next) {
      // Serializable isolation makes this predicate read the reservation; no separate table.
      if (next.status === "pending") {
        const [overlap] = await sql`
          select 1 from commerce_orders
          where id <> ${next.id} and user_id = ${next.userId} and status = 'pending'
            and preset_ids && ${sql.array(next.presetIds)}::text[]`;
        if (overlap) throw new CommerceError("checkout_in_progress", 409);
      }
      const [identity] = await sql`
        select 1 from commerce_orders
        where id <> ${next.id}
          and (session_id = ${next.sessionId} or payment_intent_id = ${next.paymentIntentId})`;
      if (identity) throw new CommerceError("order_identity_conflict", 409);
      // Account, basket, quote, creation time and return path are immutable once written.
      await sql`
        insert into commerce_orders (
          id, user_id, preset_ids, subtotal_cents, discount_cents, total_cents,
          currency, created_at, return_path, session_id, payment_intent_id, status
        ) values (
          ${next.id}, ${next.userId}, ${sql.array(next.presetIds)}::text[],
          ${next.subtotalCents}, ${next.discountCents}, ${next.totalCents},
          ${next.currency}, ${next.createdAt}, ${next.returnPath},
          ${next.sessionId}, ${next.paymentIntentId}, ${next.status}
        )
        on conflict (id) do update set
          session_id = excluded.session_id,
          payment_intent_id = excluded.payment_intent_id,
          status = excluded.status`;
    },
    async eventSeen(id) {
      const [row] = await sql`select 1 from commerce_events where id = ${id}`;
      return Boolean(row);
    },
    async recordEvent(id) {
      await sql`insert into commerce_events (id) values (${id}) on conflict do nothing`;
    },
    async paymentRevoked(id) {
      const [row] = await sql`
        select 1 from commerce_revoked_payments where payment_intent_id = ${id}`;
      return Boolean(row);
    },
    async revokePayment(id) {
      await sql`
        insert into commerce_revoked_payments (payment_intent_id) values (${id})
        on conflict do nothing`;
    },
    async ordersForPayment(id) {
      const rows = await sql<OrderRow[]>`
        select * from commerce_orders where payment_intent_id = ${id}`;
      return rows.map(order);
    },
    async entitlements(userId) {
      const rows = await sql<
        {
          preset_id: string;
          source_id: string;
          kind: Entitlement["kind"];
          revoked: boolean;
        }[]
      >`
        select preset_id, source_id, kind, revoked
        from commerce_entitlements where user_id = ${userId}`;
      return rows.map((row) => ({
        userId,
        presetId: row.preset_id,
        sourceId: row.source_id,
        kind: row.kind,
        revoked: row.revoked,
      }));
    },
    async putEntitlement(entry) {
      await sql`
        insert into commerce_entitlements (user_id, preset_id, source_id, kind, revoked)
        values (${entry.userId}, ${entry.presetId}, ${entry.sourceId}, ${entry.kind}, ${entry.revoked})
        on conflict (user_id, preset_id, source_id) do update set
          kind = excluded.kind, revoked = excluded.revoked`;
    },
    async revokeOrderEntitlements(orderId) {
      await sql`
        update commerce_entitlements set revoked = true
        where kind = 'order' and source_id = ${orderId}`;
    },
    async rewardClaim(userId, campaignId) {
      const [row] = await sql<{ preset_id: string }[]>`
        select preset_id from commerce_reward_claims
        where user_id = ${userId} and campaign_id = ${campaignId}`;
      return row ? { userId, campaignId, presetId: row.preset_id } : null;
    },
    async putRewardClaim(claim) {
      const [row] = await sql`
        insert into commerce_reward_claims (user_id, campaign_id, preset_id)
        values (${claim.userId}, ${claim.campaignId}, ${claim.presetId})
        on conflict do nothing returning 1`;
      if (!row) throw new CommerceError("reward_already_claimed", 409);
    },
    // ponytail: no verified-visit evidence exists yet, so no reward is claimable.
    // Add a table alongside the server workflow that writes it.
    async verifiedLocations() {
      return [];
    },
  };
}

const retryable = new Set(["40001", "40P01"]);

/** Serializable transactions; conflicts retry because the service makes no provider calls inside one. */
export function createPostgresCommerceStore(sql: postgres.Sql): CommerceStore {
  return {
    durability: "durable",
    async transaction(work) {
      for (let attempt = 1; ; attempt++) {
        try {
          return (await sql.begin("isolation level serializable", (tx) =>
            work(bind(tx)),
          )) as Awaited<ReturnType<typeof work>>;
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (attempt >= 3 || !code || !retryable.has(code)) throw error;
        }
      }
    },
  };
}
