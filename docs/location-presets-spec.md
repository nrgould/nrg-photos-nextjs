# Places and presets specification

Authoritative scope: October 3 daily note task “Add presets to map locations, connect to edits that I used”, all nested items, plus Nicholas's subsequent corrections. The current acceptance criteria below supersede earlier screenshots and layout drafts.

## Current overnight authorization, October 4

Nicholas authorized continuing all remaining stages sequentially without waiting for another design review. The historical map-only acceptance and deferred sections below document earlier checkpoints; this section supersedes their pause gates.

1. Finish the verified map/filter checkpoint, then fix excessive globe callout offsets and make globe/flat projection changes continuous and interruptible.
2. At global scale show country stacks; as the visitor zooms in, reveal only source-verified city/region references. Preserve exact original photo membership, stable IDs and filtered counts. Representative pins are not camera GPS. Italy intentionally represents the Dolomites; finer named locations need separate audited references.
3. Apply the approved subtle palette to both map projections: blue-gray water and warm off-white land in light mode; deep blue-gray water and charcoal land in dark mode. Keep labels/borders quiet, controls neutral with dark-green selection, and photos primary. No terrain/detail expansion or external tiles.
4. Restore a direct 21-preset catalog plus Photos/Presets drawer modes, curated collection and custom selection, then cart pricing at USD 1.99 per distinct paid preset with 20% off the eligible subtotal at ten or more. Cart collection and server-verified ownership are separate.
5. Implement/test Clerk, Stripe Checkout, signed idempotent fulfillment, entitlement and protected-delivery code. Missing credentials, durable persistence, product/Price mapping, legal terms and approved private packages block only configured operation; unconfigured routes must fail closed and UI must explain availability honestly.
6. Add local exploration progress toward five distinct verified places and photo-specific challenges. Local progress is not a paid or free entitlement. Claims require server validation and once-per-account policy. Do not invent the unconfirmed dog photograph or before/after exports.

Prints and NAS remain TODO only. No live charges, account provisioning, persistent access/security changes, private archive scan/upload, merge or production promotion. Each stage gets its own verified commit/preview and CI/review check. The existing portfolio, contact behavior and original worktree remain protected.

## Foundation

Continue `nrgould/nrg-photos-nextjs` from the existing `photo_portfolio-redesign` worktree, branch `codex/photography-redesign`, head `f078128`. Its local refinements are preserved in baseline commit `4909bd9` in an isolated checkout. The original worktree is untouched. Supported Codex task discovery did not return the original photography session; filesystem and git independently confirmed its worktree. Preserve all original photos, provenance, SSR via `connection()`, original routes and contact behavior.

## Current acceptance: map and photographs only

Nicholas explicitly deferred preset interactions after reviewing the mobile screenshots. The original Notion requirements below remain the roadmap; they are not all acceptance criteria for this iteration. Preserve their isolated data/prototype work, but remove packs, recipes, comparisons, favorites and checkout controls from the active explorer.

- `/explore` fills the viewport. No visible title, promo, site header/footer or page sections. Neutral gray/black/white UI, restrained dark-green selection, original full-color photos.
- Drawer is **closed on initial load**. Only explicit selection of a pin or a location search result opens it at the compact snap. Back/Next/Shuffle while closed move the map without opening it.
- Use the actual shadcn **Vaul-backed Drawer**. Snap states are approximately 25%, 75%, 100%. The compact state has a 180px minimum on short screens (capped at 50%) so landscape orientation can still show a photograph. At 390×844 it is exactly 25%. A visible 44px shadcn Button grab area supports drag, click, arrows, Home/End, Enter/Space. The header and close action do not scroll away.
- Photo-first compact state: one meaningful center-cropped cover preview, concise location/count, no recipe or duplicated location headings. At 75% and 100%, a vertical gallery shows the uncropped original aspect ratios and short captions. Rounded Next.js Images reserve dimensions and have responsive sizes.
- An upward photo-area gesture expands compact to 75% using Vaul. Wheel/PageDown/ArrowDown at compact also expands. Once expanded, gallery scrolling stays inside the drawer and does not drag it; use the grab area to change snaps. Dragging must not trigger a photo click.
- Clicking a photograph opens the accessible fullscreen lightbox. Arrow navigation and Escape/close return to the same drawer height and originating photo. Closing the drawer preserves map selection and restores its invoking control (search fallback when the original control is gone).
- Mobile command pill sits at bottom center when closed, floats 12px above the compact drawer, and hides at 75%/100%. Next/Back/Shuffle while compact update location/photos, reset gallery scroll, and preserve compact height. On desktop it stays centered within the unobscured map area beside the 390px drawer.
- Pill composition is a custom layout of actual shadcn Button, Tooltip and Separator. It is not the Command component. Location search uses actual shadcn Command/cmdk inside the shared Dialog; zoom uses shadcn Slider with the exact six-dot dark capsule reference styling.
- Motion 14 (`motion/react`) coordinates eased map center, zoom and focus-offset transitions. Stop the previous animation and retarget from current rendered camera values. Manual pan interrupts motion. Reduced motion removes camera animation and drawer/pill transitions. Vaul exclusively controls drawer gestures/transforms.
- Keep globe/flat modes, first-visit spinning globe introduction, keyboard/drag map pan, contact route, original routes/photos/SSR. No new map provider or network image source.
- Otium typography and the exact zoom reference below remain authoritative. All applicable controls use shared shadcn primitives; the geographic SVG map/pins are necessarily custom SVG for projection and accessible keyboard activation. No thumbnail-pin change is included without approval.

## Screenshot critique and remediation

Actual pixels of IMG_0259.jpeg and IMG_0260.png were inspected locally; the private screenshots are not committed.

| Before                                                           | After                                                                 | Why                                                                  |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Drawer opens by default and clips a large desktop hero           | Closed initially; explicit location opens compact cover               | Map is the starting experience; photo preview has deliberate framing |
| Repeated country headings, save controls, recipes and pack links | Location/count, photo gallery, close and grab handle                  | Phone hierarchy follows the current map/photo task                   |
| Header/grip scroll away into dense recipe content                | Anchored header and independently scrolling photographs               | Close and resize stay reachable                                      |
| Oversized controls and a competing pill below the drawer         | Compact map controls; pill above compact drawer, hidden when expanded | Preserve map space and avoid competing surfaces                      |
| Abrupt camera jumps                                              | Interruptible Motion center/zoom animation                            | Maintain spatial context through rapid navigation                    |

## Original nested Notion requirements, verbatim

1. Presets used at that location linked at that location, but also linked somehow at the top in a CTA
2. Custom build a preset pack through each location or buy pre-curated packs
3. Pull fonts from cadence or otium
4. Reference that fm app I found a while back - radiocast.co
5. Command bar with next, back, and random (shuffle)
6. Cheap storage bucket (not supabase)
7. JEV for classifying large image dataset
8. Globe and flat map modes - loads as a spinning globe then zooms and eases into a location on the map, so users get a feel for the point of the app and how to use it immediately
9. Contact button preserved somewhere
10. Liquid Glass controls?
11. Slider with snap points for zoom: [reference image inspected locally]
12. Favorite certain locations or photos and see it like a “cart” - shadcn sidebar
13. Texture on certain components/controls [reference image inspected locally]

The original sidebar reference is superseded by the later full-screen map, no navigation sidebar, and explicitly requested contextual right photo canvas/mobile bottom sheet. The original texture/glass suggestions do not override the latest neutral shadcn styling and restrained zoom direction.

## Deferred integrations

Preset/location associations, custom/curated packs, favorites/cart, paid checkout, and real before/after comparison are deferred from the active experience. Existing sample data remains explicitly labeled and is not verified edit history. The 21-name public catalog remains separate from private XMP files.

Existing local derivatives remain local. The deterministic non-Supabase/R2 manifest and JEV adapter contract remain dry-run plans only: zero uploads or inference. Endpoint, costs, retention, actual applied-preset history, paired exports, sales terms and entitlement all require real inputs before production integration. See `photo-pipeline.md`.

## Real pack and before/after

The read-only Desktop discovery found **2026 Signature Collection**: 21 numbered XMP presets, PDF/HTML install guide, buyer ZIP and handoff. All XMP files parsed successfully. Public catalog exports only name, order, category and a stable public ID; no raw preset settings, private source names, contact metadata or buyer ZIP.

**Deferred prototype:** list all 21 presets, filter by Landscape & travel / Nature / Film / Portrait, select a preset and open its comparison. A draggable line must reveal aligned exports of the same photograph before and after that named preset. Support pointer/touch, arrows, Home/End and visible focus; preserve image color and crop alignment.

The pack's own handoff states before/after exports are missing; the folder has no paired images. Current comparison is an opt-in, explicitly labeled same-image interaction demo. No CSS filter pretends to be a Lightroom render. Enable real comparison only with approved same-photo, same-crop exports and verified preset/source IDs in `verifiedPairs`. The sample JSON selection is not an XMP/Lightroom preset.

## Reference and typography evidence

Initially only the Notion screenshots were visually inspected and the Radio Cast URL fetched as text. That was insufficient composition analysis. Subsequently the live Radio Cast site was rendered in Chrome on desktop and at 390×844, and its welcome dismissal plus player minimize/expand were exercised. Observed: full-viewport geography, floating top search/corner actions, and a contextual player that collapses to a slim bottom strip; no scrolling page sections. Adopt that spatial behavior with the requested right photo canvas/mobile sheet, not its newer glass treatment or promotional text. No audio playback started.

Otium sources read: `reskill/otium/app/layout.tsx`, `app/globals.css`, `DESIGN.md`. Product register, not the marketing Jost register:

- Hanken body: 14px / 1.5, weight 400, kern/liga/calt, base tracking −0.01em.
- Hanken block headings: 17px / 1.3, weight 600, tracking −0.005em.
- Hanken labels: 11.5px / 1.4, weight 600, tracking 0.11em, uppercase.
- Fraunces surface titles: 22px / 1.15, weight 450 light and 520 dark, tracking −0.012em; opsz 48, SOFT 0, WONK 0; loaded variable axes and normal/italic.
- Otium's 14px container / 11px control radii inform the shared surfaces. No Hack font is needed because this UI contains no code/trace content.

Earlier implementation matched the two families only. The final pass applies these exact relevant source tokens, while adapting responsive composition to this map product.

## Integration and verification

Reuse `travelPlaces`, `Photo`, `photo-manifest.json`, local geography, `globeFrame`, `PhotoImage`, `Lightbox`, `Button` and Base UI Dialog. Extend flat projection with focus offsets instead of adding a provider. Keep the separate homepage globe linked to `/explore`. No global store, duplicated image manifest or live billing/classifier framework.

Pre-implementation slop audit reviewed repository contracts; no unresolved A/B/C/D duplication issues. QMD was unavailable because its database was read-only. Later layout corrections are reflected above rather than treated as additional sections.

Run lint/typecheck/tests/build and SSR checks. Browser verify closed initial state; compact/75%/100% snaps; handle and photo gestures; independent gallery scrolling; command pill at each state; lightbox return/focus; rapid camera retargeting; both themes; 390px and narrower phones, landscape and desktop. Capture final desktop/mobile screenshots. Use a draft PR and babysit CI/review without merging. Vercel preview is authorized; no production promotion, purchases, security weakening or private-image transmission.

## October 4: approved map engine and commerce direction

The current implementation milestone stays map/photos. MapLibre6.12 replaces the explorer's custom SVG gesture/camera implementation. It owns native pan/pinch/inertia, sensible latitude bounds, globe/Mercator projection and infinite horizontal world copies. Local Natural Earth data is unwrapped at build time to prevent dateline artifacts; the original homepage D3 globe and source geometry remain unchanged. No tiles/API keys or external map services. Photo markers are48px rounded squares, lightly offset for Austria/Italy; the zoom icon opens the shadcn Popover and six-stop control (Globe → World → Continent → Region → Area → Local). Vaul remains the only drawer transform/snap owner. Compact shows every location photo; expanded shows a balanced gallery; Motion supplies restrained image/slider feedback.

### Next phase: portfolio and preset commerce

Support two equally direct entrances: **Explore places** for immersive portfolio discovery, and **All presets** for a searchable catalog with price and purchase actions immediately visible. The catalog must never require map navigation. A preset detail links back to every verified associated location/photo; selecting a location highlights it and opens its photographs without losing the selected preset or catalog filters. Conversely, location photographs link to the actual preset/edit used once provenance is confirmed.

The drawer can share the established shell with explicit **Photos** and **Presets** modes. Keep the current location, map camera, gallery/catalog scroll and selected preset separately so switching modes or returning from checkout restores context. All presets opens the catalog directly at75% (full-height available), offers search/filter plus clear purchase action, and has an addressable /presets route for direct links and fast shopping. Location mode may show a scoped preset list with an obvious All presets escape. No confusing automatic mode switches. Mobile compact previews stay useful; deeper product detail uses the larger drawer or dedicated addressable detail page.

Product records need stable IDs, real names, descriptions, software compatibility, included files/license, version, verified sample images and edit provenance, associated location IDs, and a server-owned Stripe Price ID. The private21-file XMP pack exists, but sellable product boundaries, names, prices, verified photo→preset usage and real before/after pairs are not established. Current sample recipes are placeholders and cannot become purchase claims. Do not publish the private source files into public/ or the public repository.

Plan Stripe hosted Checkout for the first purchase path: server validates a product ID against the published catalog and creates a one-time Checkout Session using an allowlisted Price ID; never trust client prices or arbitrary redirects. Verify webhook signatures over the raw request body, record event IDs and order transitions idempotently, and grant entitlements only after confirmed paid status (including asynchronous success/failure). A success redirect alone never grants downloads. Keep order/entitlement data server-side; serve private preset archives through authenticated or signed expiring download links with access checks. Handle duplicate/out-of-order events, cancellation, payment failure, retry, refunds/revocation policy and download recovery. Test these paths with Stripe test mode before any live enablement. Secrets remain server-only and separate for preview/live environments. No live products, prices, credentials, webhooks, charges or storage provisioning are part of the present map milestone.

Acceptance for the commerce milestone: buy directly from the complete catalog in minimal steps; explore preset→locations→photos and back with context intact; show only substantiated edit associations; preserve original-photo fidelity; deliver only after verified payment; reject tampered product/price requests; replayed webhooks do not duplicate orders or grants; unpaid/expired links cannot retrieve archives. Required business inputs before activation: Stripe account/environment, catalog/package boundaries and prices, licenses/refund policy, verified edit/photo mappings, authentic comparison exports, and private delivery storage choice.

References: [Stripe Checkout](https://docs.stripe.com/payments/checkout), [fulfillment](https://docs.stripe.com/checkout/fulfillment), [webhook signatures](https://docs.stripe.com/webhooks/signature).
