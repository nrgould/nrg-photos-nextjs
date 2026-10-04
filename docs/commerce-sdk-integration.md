# Commerce SDK composition

> October 4, 2026 update: `@clerk/nextjs` and `src/proxy.ts` are removed. Accounts use Supabase Auth: `CommerceProviders` creates one browser client, `AccountControl` signs in with an emailed code, and route handlers verify the session with `getClaims()`. `getCommerceHandlers()` builds the Postgres store when `DATABASE_URL` is set. The Clerk sections below are historical.

October 4, 2026. Official `stripe` 23.0.0 and `@clerk/nextjs` 7.9.10 are installed. This checkpoint does not activate checkout, issue entitlements, expose private XMP, provision resources, or contact payment/account providers in tests.

## Wiring

The root server layout reads `getAccountPublicConfiguration()?.publishableKey ?? null`. Pass only that public key to `CommerceProviders`, then render `CommerceCartProvider` inside it. Keep the existing request-time `connection()` call. The conditional provider renders Clerk only when explicit test account configuration is present; no keyless fallback runs. `AccountControl` renders nothing when disabled.

`CommerceCartProvider` owns the single `useCommerceBoundary` instance and wraps `PresetCartProvider` with the current server-confirmed ownership IDs. Do not nest another cart provider. Components consume `usePresetCommerceBoundary()`:

- `checkout`: `PresetCheckoutBoundary`, suitable for the cart panel.
- `ownedPresetIds`: only the current verified session/revision response; never restored from storage.
- `ownershipStatus`: `verified` or `unknown`.
- `refreshOwnership()`: invalidates old evidence and refetches availability/ownership.

Checkout is unavailable until both availability and current-session ownership are verified. Focus refresh, sign-out, and account/session changes remove stale ownership and disable checkout immediately. The server remains authoritative even after verification. `PresetDownloadButton({presetId})` requests the authenticated delivery boundary; render it only for a server-confirmed owned preset.

Checkout attempt IDs persist in session storage only for retry identity. They are keyed by user, distinct sorted published preset IDs, and normalized return path; they confer no ownership. Returned/cancelled URL flags never grant ownership. Checkout/download requests are aborted on account/session change or unmount, and late responses cannot redirect a different account. Local cart and exploration state carry no entitlement authority.

## Server boundary

`src/proxy.ts` initializes Clerk middleware only for explicit test account configuration. It leaves public availability, signed webhooks, and the existing contact route outside session middleware. Authenticated operations derive identity from Clerk server `auth()`, not request JSON.

Six Node route handlers compose the server handlers:

| Route                               | Method | Disabled behavior            |
| ----------------------------------- | ------ | ---------------------------- |
| `/api/commerce/availability`        | GET    | 200 `{status:"unavailable"}` |
| `/api/commerce/checkout`            | POST   | 503                          |
| `/api/commerce/webhook`             | POST   | 503                          |
| `/api/commerce/ownership`           | GET    | 503                          |
| `/api/commerce/reward-claim`        | POST   | 503                          |
| `/api/commerce/download/[presetId]` | GET    | 503                          |

All responses are private/no-store. `composeCommerceRuntime` checks full test configuration and a durable store before importing either server SDK. `getCommerceHandlers()` intentionally supplies no store. Even complete provider configuration therefore remains unavailable. There is no filesystem or production memory fallback.

Activation requires an approved durable transactional store satisfying the reservation/event/entitlement contract in [commerce-server-foundation.md](./commerce-server-foundation.md), test provider configuration, and private delivery. Reward issuance additionally needs trusted server evidence and an explicit campaign; local visits are insufficient. Rate limiting and provider sandbox end-to-end verification remain prerequisites before exposing configured commerce. Live operation is unsupported at this checkpoint.

## Verification

- Official Stripe `generateTestHeaderString` signs local fixtures; the actual `constructEvent` verifies them through the adapter. Changed bytes, wrong secrets, expired signatures, and live events fail. Signed payment/replay/refund fixtures exercise idempotent account-bound service ownership. A throwing SDK HTTP client proves these tests perform no Stripe calls.
- Runtime tests install a module-resolution tripwire against provider imports. Disabled, invalid, missing-store, and test-only-store combinations return unavailable/503. Actual exports of all six route files are exercised in a server-conditioned child process.
- Client contracts verify retry identity, account/cart/context changes, malformed storage, catalog allowlisting, exact Stripe redirect origin, and current-session/revision ownership invalidation.
- Full typecheck confirms the official Stripe client and Clerk `auth` satisfy the adapter contracts. Authenticated browser flows and private delivery remain unverified because no services or durable adapter are configured.

References: [Stripe Node webhook testing](https://github.com/stripe/stripe-node#webhook-signing), [Clerk middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware), [Clerk server auth](https://clerk.com/docs/reference/nextjs/app-router/auth). The installed Next 16 route-handler and proxy documentation was checked before integration.
