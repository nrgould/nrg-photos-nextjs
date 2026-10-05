# Commerce server foundation

> October 4, 2026 update: Clerk was replaced by Supabase Auth (email code sign-in) and the durable store is `commerce/postgres.ts`. Clerk mentions below in the integration order are historical.

Staged October 4, 2026. This is test-only integration code, not an activated store. It creates no accounts, products, prices, coupons, webhooks, storage, emails, purchases or real entitlements by itself. No private preset bytes are included. The active repository is unchanged by staging.

## Delivered

| Module                                   | Contract                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`                              | Explicit `COMMERCE_MODE=stripe-test`; complete test-key/Price mapping; fixed application origin; live/partial configuration rejected. Defaults disabled. No environment-file reads or SDK side effects.                                                                                                                                                              |
| `service.ts`                             | Server catalog allowlist, 199-cent USD prices, distinct paid-item counting, whole-subtotal 20% discount at ten items, deterministic cent rounding. Account-bound persistent Checkout intent and idempotent webhook/order/entitlement transitions.                                                                                                                    |
| `stripe.ts`                              | Typed structural adapter for the official Stripe Node SDK. Retrieves/validates configured Prices and coupon; creates hosted Checkout with fixed return routes and idempotency key. Delegates raw-body signature verification to the SDK. Rejects live sessions/events and unexpected totals/tax/shipping.                                                            |
| `auth.ts`                                | Awaits a verified server session (Supabase `getClaims()`); never accepts identity from request JSON.                                                                                                                                                                                                                                                                 |
| `postgres.ts`                            | Durable `CommerceStore` on Supabase Postgres: serializable transactions with conflict retry. Schema in `supabase/migrations/`.                                                                                                                                                                                                                                       |
| `http.ts`                                | Request-body allowlist, bounded body reads, same-origin mutation checks, private/no-store responses, authenticated ownership/downloads and reward claims. Every operational route returns 503 before provider/auth calls unless configuration, durable store, service and auth adapter are supplied. Public availability reveals only `unavailable` or `test-ready`. |
| `types.ts`                               | Transactional store and private delivery interfaces.                                                                                                                                                                                                                                                                                                                 |
| `tests/support/commerce-memory-store.ts` | Serialized, rollback-capable fixture with uniqueness checks; explicitly `test-only`. Not application source and refused by HTTP readiness.                                                                                                                                                                                                                           |

Checkout request: `{ paidPresetIds: string[], requestId: string, returnPath?: "/presets" | "/explore" }`. Generate one stable request ID per checkout attempt and retain it on network retries. Reject changes to the basket or return path using that request ID. The route accepts no account, price, coupon, total, owned IDs, reward entitlement, visits or arbitrary URL. A free reward uses the separate authenticated claim boundary, so it cannot inflate the paid-item discount threshold.

Different request IDs for the same pending account/basket/return path reuse the existing order and provider session. Persist immutable request-to-order aliases. A changed basket overlapping an open reservation returns `checkout_in_progress`; it cannot create a second payable session. Ownership is checked before any retry/reuse and again after awaiting the provider. Reward claims also refuse a preset with a pending paid checkout.

The session URL is returned only after provider totals match the server order. The cart quote has no invented tax. This test-only implementation rejects tax/shipping instead of silently omitting them from a final charged amount. Tax policy must be decided before any live implementation.

## Integration order

1. Finish the map/filter/globe and catalog checkpoints. Copy only this directory's `src/lib/server/commerce` and dedicated tests into the project. Keep the existing public `presetCatalog` as the single catalog source: pass `presetCatalog.map(p => p.id)` to configuration and service construction. No sample recipe IDs.
2. Add the official server `stripe` package and `@clerk/nextjs` when the parent owns dependency updates. Hosted Checkout requires no Stripe browser SDK. Current adapters have no SDK import/runtime dependency; injected official clients satisfy their documented structural subsets. Confirm installed SDK structural assignability in the integration typecheck.
3. Read configuration from server environment in a server-only composition module. Do not log or serialize the returned configuration (it contains secrets). Construct SDKs only after configuration is valid. Keep `connection()` and all public portfolio routes intact. Add no keyless Clerk initialization or setup CLI.
4. Configure Clerk with `src/proxy.ts` for Next.js 16 and a conditionally rendered provider only when configured. Protect account/commerce operations at the server boundary. Keep webhook signature authentication independent from session authentication, and keep the existing contact route/public assets accessible. Missing auth configuration must not break the portfolio.
5. Supply a real durable `CommerceStore` and a real private-delivery adapter before claiming these services work. Until then bind handlers without those dependencies: operational responses are honestly 503. Do not relabel the memory fixture `durable` in application code.
6. Wire Next route exports to the handlers: POST checkout/webhook/reward-claim, GET ownership/download/availability. Keep Node runtime. The HTTP wrapper already supplies no-store responses. For downloads, pass only the route preset ID, never a client file key/path.
7. Frontend `PresetCheckoutBoundary` stays `unavailable` unless availability reports `test-ready`. Its `startCheckout({paidPresetIds,returnPath})` adapter adds the stable request ID, POSTs, and follows the returned Stripe URL. Only authenticated ownership results produce Owned badges; 503/401 means unknown. A checkout return query does not grant anything.

## Configuration names

All are unset by default except the explicit disabled mode. Do not provision resources to fill these automatically.

```dotenv
COMMERCE_MODE=disabled
COMMERCE_ORIGIN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRESET_PRICE_IDS=
STRIPE_BULK_COUPON_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
```

`STRIPE_PRESET_PRICE_IDS` is a JSON object mapping every published preset ID to a unique configured one-time test Price ID. Each Price must be active, USD and exactly 199 cents. The configured coupon must be valid, test-mode, unrestricted, once-only and exactly 20 percent off. The adapter does not create or modify provider objects. Confirm actual Checkout rounding against the server quote using sandbox fixtures before activation; any mismatch is rejected rather than charged through this app.

`COMMERCE_ORIGIN` is an HTTPS origin (HTTP permitted only for localhost/127.0.0.1), never a path or credentials-bearing URL. Only exact `/presets` and `/explore` return paths are supported. Live keys, live events and a live mode are unsupported intentionally.

## Durable store requirements

Use a shared transactional database. No durable service is configured here. A local SQLite adapter may support development, but Vercel functions cannot share a persistent local SQLite/JSON ledger. An in-memory process Map is equally unsuitable for payments.

Every `transaction` must provide serializable isolation (retry serialization conflicts), rollback on callback failure, and these database constraints:

- Orders: primary key `id`; unique non-null `session_id` and `payment_intent_id`; immutable account, basket, quote, creation timestamp and return path. Status transitions cannot overwrite `revoked` with a paid snapshot.
- Checkout requests: unique immutable request-key hash to order-ID binding, including aliases for reused orders.
- Pending reservations: unique `(user_id, preset_id)` to pending order ID. `putOrder` must acquire/release these in the same transaction as the order status; the matching predicate query and insertion must use serializable isolation or account-level locking. Release on a verified terminal order transition, never just because a new client request arrives. Keep reservations for unpaid completion while asynchronous payment is pending.
- Processed events: unique Stripe event ID. Commit its insertion together with the order and entitlement updates, never before fulfillment commits.
- Revoked payments: unique PaymentIntent ID. Persist tombstones even when no order has that PaymentIntent yet.
- Entitlements: unique `(user_id, preset_id, source_id)` with source kind and revocation state. Multiple legitimate sources may independently grant the same preset; refunding one order revokes only that order's grants.
- Reward claims: unique `(user_id, campaign_id)`. Commit claim and grant together.
- Verified visits: unique account/campaign/location evidence records written only by an independently validated server workflow. LocalStorage/client visit lists are not evidence.

Checkout intent and reservations are saved before requesting Stripe, and the order ID is the Stripe idempotency key. A bound session is retrieved on retry. An unbound intent older than 30 minutes requires provider reconciliation before clearing its reservation and starting a new attempt; another request ID cannot bypass the reservation. This fails closed after ambiguous provider responses instead of risking recreation after Stripe's idempotency retention. The reconciliation/administrative recovery workflow remains unimplemented. Stored quotes remain immutable and are checked again on fulfillment.

Subscribed events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`. Success redirects are ignored for fulfillment. Repeated/out-of-order event handling is tested. Unknown orders or mismatches return non-2xx for investigation/retry and do not consume the event marker.

The conservative **test policy** suspends all grants from an order on any nonzero refund or new dispute; later paid events cannot restore them. Partial-refund allocation, dispute reinstatement and the published refund policy are unresolved business rules. This is not a claim that the production policy is decided.

## Rewards and downloads

The runtime configures one campaign (`explore-2026`) over the whole catalog. A claim takes no body: the account comes from the verified Supabase session, and the authenticator admits only a permanent account with a confirmed email (`email_required` otherwise), so the free preset is one per email. Challenges are browser-only progress and are not server evidence; the email account is the abuse boundary.

A reward claim and paid purchase are separate sources. Claim retries return the same existing claim. The draw skips presets the account owns or has reserved by a pending paid checkout. Rate controls for the claim endpoint are still open.

Downloads require an active entitlement and a server-controlled delivery adapter that maps preset IDs to approved private files. The adapter must issue a signed, expiring HTTPS URL from an allowlisted storage origin with a 60-second TTL; no delivery adapter is included. Recheck the exact entitlement after awaiting the signer: a refund committed during signing suppresses the URL. A signed URL already returned may remain valid for its remaining TTL after a later refund. Do not publish archives/XMP files or return public file paths. Private storage, licensing and package approval remain blockers.

## Verification and limits

Run tests with Node24 from the project root:

```sh
npm test
```

After integration the project `npm test`, lint and typecheck include these files. Unit tests cover quote thresholds, malicious input, account/session binding, retries, no unpaid grants, event/session duplicates, late failed events, refund-before-payment, rollback, server reward evidence, one-time claims, unauthorized downloads, SDK raw-body delegation, configuration/live rejection and disabled-route zero calls.

These tests inject provider methods. They do not establish real SDK signature interoperability, Clerk sessions, durable database concurrency, signed storage delivery or end-to-end Stripe payment. Those integration tests require the corresponding installed/configured adapters. No account or network payment calls were made during staging. Add real SDK-signed webhook fixtures once the package is installed, then use an explicitly configured sandbox for full integration. Add account/IP request throttling before exposing enabled checkout/claim handlers.

Primary references checked during implementation: [Checkout parameters](https://docs.stripe.com/api/checkout/sessions/create), [fulfillment](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted), [signature and event ordering](https://docs.stripe.com/webhooks), [Price fields](https://docs.stripe.com/api/prices/object), [coupon fields](https://docs.stripe.com/api/coupons/object), [Clerk Next.js setup](https://clerk.com/docs/nextjs/getting-started/quickstart), [Vercel local storage limitation](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel).
