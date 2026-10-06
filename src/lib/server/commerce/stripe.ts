import type { CommerceConfiguration } from "./config";
import { checkoutReturnUrl } from "./return-path";
import {
  CommerceError,
  type CheckoutSession,
  type PaymentEvent,
  type PaymentGateway,
} from "./types";

type StripePrice = {
  id: string;
  active: boolean;
  livemode: boolean;
  currency: string;
  unit_amount: number | null;
  type: string;
};
type StripeCoupon = {
  id: string;
  valid: boolean;
  livemode: boolean;
  percent_off: number | null;
  amount_off: number | null;
  duration: string;
  applies_to?: { products: string[] };
};
export type StripeCheckoutParameters = {
  mode: "payment";
  line_items: { price: string; quantity: 1 }[];
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  metadata: { orderId: string };
  payment_intent_data: { description: string; metadata: { orderId: string } };
  automatic_tax: { enabled: true };
  adaptive_pricing: { enabled: false };
  expires_at: number;
  discounts?: { coupon: string }[];
};
/** Structural subset accepted by the official Stripe Node SDK; inject a client initialized with the configured key. */
export interface StripeClient {
  prices: { retrieve(id: string): Promise<StripePrice> };
  coupons: { retrieve(id: string): Promise<StripeCoupon> };
  checkout: {
    sessions: {
      create(
        params: StripeCheckoutParameters,
        options: { idempotencyKey: string },
      ): Promise<unknown>;
      retrieve(id: string): Promise<unknown>;
    };
  };
  webhooks: {
    constructEvent(raw: string, signature: string, secret: string): unknown;
  };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CommerceError("invalid_provider_payload");
  return value as Record<string, unknown>;
}
function string(value: unknown) {
  if (typeof value !== "string" || !value)
    throw new CommerceError("invalid_provider_payload");
  return value;
}
function cents(value: unknown) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    throw new CommerceError("invalid_provider_payload");
  return value;
}
function paymentIntent(value: unknown): string | null {
  if (value === null) return null;
  const id = string(typeof value === "string" ? value : record(value).id);
  if (!id.startsWith("pi_"))
    throw new CommerceError("invalid_provider_payload");
  return id;
}
function session(value: unknown, live: boolean): CheckoutSession {
  const data = record(value);
  if (data.livemode !== live || data.mode !== "payment")
    throw new CommerceError("livemode_or_invalid_session");
  if (
    data.status !== "open" &&
    data.status !== "complete" &&
    data.status !== "expired"
  )
    throw new CommerceError("invalid_session_status");
  if (
    data.payment_status !== "paid" &&
    data.payment_status !== "unpaid" &&
    data.payment_status !== "no_payment_required"
  )
    throw new CommerceError("invalid_payment_status");
  const details = record(data.total_details);
  // Stripe Tax adds tax; nothing ships.
  if (cents(details.amount_shipping) !== 0)
    throw new CommerceError("unexpected_shipping", 409);
  const customer =
    data.customer_details === null || data.customer_details === undefined
      ? null
      : record(data.customer_details);
  return {
    id: string(data.id),
    url: data.url === null ? null : string(data.url),
    orderId: string(record(data.metadata).orderId),
    paymentIntentId: paymentIntent(data.payment_intent),
    status: data.status,
    paymentStatus: data.payment_status,
    currency: string(data.currency),
    subtotalCents: cents(data.amount_subtotal),
    discountCents: cents(details.amount_discount),
    taxCents: cents(details.amount_tax),
    totalCents: cents(data.amount_total),
    email:
      typeof customer?.email === "string" && customer.email
        ? customer.email.trim().toLowerCase()
        : null,
  };
}

export function createStripeGateway(
  client: StripeClient,
  configuration: CommerceConfiguration,
): PaymentGateway {
  const live = configuration.mode === "stripe-live";
  return {
    async createCheckout(order) {
      if (order.sessionId)
        return session(
          await client.checkout.sessions.retrieve(order.sessionId),
          live,
        );
      const priceIds = order.presetIds.map((id) => {
        const price = configuration.priceIds[id];
        if (!price) throw new CommerceError("price_not_configured", 503);
        return price;
      });
      const prices = await Promise.all(
        priceIds.map((id) => client.prices.retrieve(id)),
      );
      if (
        prices.some(
          (price, index) =>
            price.id !== priceIds[index] ||
            !price.active ||
            price.livemode !== live ||
            price.currency !== "usd" ||
            price.unit_amount !== 199 ||
            price.type !== "one_time",
        )
      )
        throw new CommerceError("price_configuration_mismatch", 503);
      if (order.discountCents) {
        const coupon = await client.coupons.retrieve(
          configuration.bulkCouponId,
        );
        if (
          coupon.id !== configuration.bulkCouponId ||
          !coupon.valid ||
          coupon.livemode !== live ||
          coupon.percent_off !== 20 ||
          coupon.amount_off !== null ||
          coupon.duration !== "once" ||
          coupon.applies_to?.products.length
        )
          throw new CommerceError("discount_configuration_mismatch", 503);
      }
      const result = await client.checkout.sessions.create(
        {
          mode: "payment",
          line_items: priceIds.map((price) => ({ price, quantity: 1 })),
          success_url: checkoutReturnUrl(
            configuration.origin,
            order.returnPath,
            "returned",
          ),
          cancel_url: checkoutReturnUrl(
            configuration.origin,
            order.returnPath,
            "cancelled",
          ),
          client_reference_id: order.id,
          metadata: { orderId: order.id },
          // Stripe's receipt email prints the description.
          payment_intent_data: {
            description: `Lightroom presets. Sign in at ${new URL(configuration.origin).host} with this email to download them on any device.`,
            metadata: { orderId: order.id },
          },
          automatic_tax: { enabled: true },
          adaptive_pricing: { enabled: false },
          expires_at: Math.floor(order.createdAt / 1000) + 3600,
          // Promotion codes default off; sending allow_promotion_codes beside discounts makes Stripe reject the session.
          ...(order.discountCents
            ? { discounts: [{ coupon: configuration.bulkCouponId }] }
            : {}),
        },
        { idempotencyKey: `preset-order:${order.id}` },
      );
      return session(result, live);
    },
    verifyWebhook(rawBody, signature): PaymentEvent {
      let verified: unknown;
      try {
        verified = client.webhooks.constructEvent(
          rawBody,
          signature,
          configuration.webhookSecret,
        );
      } catch {
        throw new CommerceError("invalid_webhook_signature");
      }
      const event = record(verified);
      const id = string(event.id);
      if (event.livemode !== live) throw new CommerceError("livemode_mismatch");
      const object = record(event.data).object;
      const types = {
        "checkout.session.completed": "completed",
        "checkout.session.async_payment_succeeded": "paid",
        "checkout.session.async_payment_failed": "failed",
        "checkout.session.expired": "expired",
      } as const;
      const type = string(event.type);
      if (Object.hasOwn(types, type))
        return {
          id,
          type: types[type as keyof typeof types],
          session: session(object, live),
        };
      if (type === "charge.refunded" || type === "charge.dispute.created") {
        const data = record(object);
        if (type === "charge.refunded" && cents(data.amount_refunded) === 0)
          return { id, type: "ignored" };
        const paymentIntentId = paymentIntent(data.payment_intent);
        if (!paymentIntentId) throw new CommerceError("missing_payment_intent");
        return { id, type: "revoked", paymentIntentId };
      }
      return { id, type: "ignored" };
    },
  };
}
