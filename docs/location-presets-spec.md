# Places and presets specification

Current acceptance, October 4, 2026. Source: the full October 3 Notion task “Add presets to map locations, connect to edits that I used”, including all 13 nested items, plus Nicholas’s later map, commerce, rewards and SEO directions. This document describes the integrated prototype; prior map-only pauses are superseded.

## Foundation and preservation

Continue `nrgould/nrg-photos-nextjs` from the existing `photo_portfolio-redesign` worktree, branch `codex/photography-redesign`, head `f078128`. Local refinements were preserved in baseline `4909bd9` in an isolated checkout. Supported Codex discovery did not return the original photography session; filesystem and Git independently confirmed the worktree. The original checkout is untouched. Preserve all 39 public photographs, source identity, existing routes, request-time SSR via `connection()`, contact behavior and original homepage globe.

## Original nested Notion requirements, verbatim

1. Presets used at that location linked at that location, but also linked somehow at the top in a CTA
2. Custom build a preset pack through each location or buy pre-curated packs
3. Pull fonts from cadence or otium
4. Reference that fm app I found a while back - radiocast.co
5. Command bar with next, back, and random (shuffle)
6. Cheap storage bucket (Nicholas chose Supabase Storage on 2026-10-04)
7. JEV for classifying large image dataset
8. Globe and flat map modes - loads as a spinning globe then zooms and eases into a location on the map, so users get a feel for the point of the app and how to use it immediately
9. Contact button preserved somewhere
10. Liquid Glass controls?
11. Slider with snap points for zoom: [reference image inspected locally]
12. Favorite certain locations or photos and see it like a “cart” - shadcn sidebar
13. Texture on certain components/controls [reference image inspected locally]

The latest mobile simplification removes the map contact and filter controls and explorer graticule. Preset search later returned at the top of All presets. Contact remains available through the existing site route and navigation. Catalog/category, cart and challenge content use a single scroll surface. Cart, challenges and preset detail open as a nested drawer over the explorer drawer. A sufficiently long downward pull dismisses any drawer snap; scrolling away from the top stays native. These directions supersede earlier map controls and search requirements.

The original sidebar reference is superseded by the later full-screen map, no navigation sidebar, and explicitly requested contextual right photo canvas/mobile bottom sheet. The original texture/glass suggestions do not override the latest neutral shadcn styling and restrained zoom direction.

## Implemented experience

- Full-viewport neutral map with original full-color photographs, top All presets CTA, place search and Next/Back/Shuffle command pill. The initial drawer is closed. Explicit place selection opens the actual shadcn/Vaul drawer at 25%; 75% and 100% provide deeper browsing. The grab area supports pointer and keyboard; expanded content scrolls independently. Lightbox returns to its originating photo and drawer height.
- MapLibre 6.12 owns pan, inertia, projection and camera. Local Natural Earth geometry needs no paid map service or API key. Deliberate zoom smoothly changes globe/flat projection; latitude changes from pan do not. Country stacks center on eligible photographed child regions. Nine audited regional leaves partition the 11 map photographs without invented GPS. Dense markers retain offsets during gestures and settle with short leaders; hidden markers are inert. Explorer graticules and subject/format filter controls are removed; country borders remain.
- Otium typography, restrained neutral shadcn controls, subtle blue-gray water and warm land. Radio Cast’s rendered desktop/mobile spatial composition informed the full-viewport map and contextual drawer. Liquid Glass and texture remain restrained suggestions, superseded by the later neutral styling direction. Six-stop zoom is Globe → World → Continent → Region → Area → Local. The control rests on discrete stops while native map gestures remain continuous. Previous/Next form an adjacent pair, with Shuffle separate. Supported touch browsers receive restrained optional selection pulses; iOS Safari has no generic vibration API. See `zoom-controls-verification.md`.
- The map’s Presets mode sells the kept location presets (28), listed by place (country first, so Lofoten I and II sit together) and filtered by mood, including moods a preset is only also listed under; the Signature Collection is retired. Each row is a shadcn Item with its mood's Lucide icon, name, mood, price and add button, and the whole row opens the preset. A place shows the same rows under its hero photos as “Presets used at this location”: three, with Show all rolling out the rest, then “Photos from this location” over the grid, where a landscape photo takes two cells of a row (one with no portrait near enough runs full width), and each photo holds a pulsing skeleton until it fades in. A preset opened over a place opens at 75% on a phone and drags to 100%. Add all adds only the presets the current search and mood show. Clear cart sits in the cart header. Search (preset name, moods, and the place it was made up to its country; accent-blind; Escape clears it before closing the drawer), category filtering, addressable detail, curated complete collection and individual custom selection are available. Every row has a real `/presets/[id]` link. Photos/Presets/Cart/Challenges preserve selected place, camera and separate browsing state. Checkout return paths validate and restore location, category, preset and view; legacy search parameters cannot hide presets.
- Persistent cart contains only allowlisted selections. Each distinct paid preset is USD 1.99; ten or more get 20% off the paid subtotal, rounded in integer cents. Nine = $17.91; ten = $15.92; all 28 = $44.58. Cart is never ownership. Owned IDs require current-session server verification. Checkout is visibly unavailable until configured.
- Local progress records distinct real leaf visits. Five places completes a local milestone; opening the exact “Into the Arctic” photograph completes the red-boat challenge. Only challenges whose photograph is published are listed; the dog challenge returns when its photo ships. Challenges are tracked in the browser, so the server's gate is the account: Claim asks a guest to create a free account (email, then a code, with an unchecked “Email me when new presets come out” box whose consent is saved on the account as `marketing_opt_in`, a timestamp), and only a confirmed email account can claim, once per campaign (`explore-2026`); the server draws the free preset at random from the eligible presets the account does not own or have in a pending checkout, and a repeat claim returns the same preset. The ownership response carries the claimed preset, so Challenges shows it as Claimed on later visits.
- Clerk and Stripe SDK composition, account-bound checkout reservations, signed raw-body webhooks, idempotent paid fulfillment, refund revocation and protected download contracts are implemented and fixture-tested. All operational routes fail closed without an approved durable store and configuration; no production memory fallback. Account changes invalidate ownership and suppress stale checkout/download redirects.
- Server-rendered discovery pages cover 9 locations, 35 photographs and 28 presets. Visible navigation and real links connect them. Preview responses, including images, are noindex; the preview sitemap is empty. Future `nrgstudios.co` indexing requires explicit launch configuration and a production environment. No domain/DNS or production change is authorized by this implementation.

## Evidence-dependent work and activation limits

The catalog is `src/data/presets.json`, written by `node scripts/import-presets.mjs [<preset library dir>]` from the library's `site-export/presets.json`, `lineup.json` (keep, mood, order, and optional name, also-fits moods, place and showcase) and `site-export/examples.json` (every kept preset has a before/after pair). Only id, number, name, mood and other moods, place, the usage text (best for, what it does, watch out), the before/after pair's storage keys and size, and the showcase srcs enter the repository. No private settings, file names, original paths, ZIPs or XMP files are published. The import fails on a showcase src that is not a map photo.

Every preset is tied to the place it was made for: the location its id names (grainau-1 is Grainau) unless lineup.json sets `location`. A preset page shows, in order: "Made in <place>" under its name (a place opens; a region opens its country's places), the before/after slider (both exports from the public `preset-examples` bucket, one shared size; a skeleton holds its place until both load, so stepping presets never shows the previous pair), price, the usage text, showcase photos from its place that were not edited with it ("Photos from <place>"), then the photos edited with it: the showcase ones first, then every other map photo by place; each place name flies to it and each photo opens in its place, stacked on the page so Back returns to it. Opened from All presets, it steps to the previous and next preset in the catalog's current filter. A place lists the presets made there or in its region and the presets its photos were edited with. A photo's preset is the `presetId` Lightroom's develop history records on its map export row; the photo import keeps only ids in the catalog. Sections without data are left out. Unrelated photos and CSS filters never stand in for applied-edit evidence. Photo/location favorites live in a Saved drawer mode (browser-local, like the cart and progress); the active cart selects real presets.

Cheap non-Supabase storage and JEV classification have deterministic dry-run manifest/adapter contracts in `photo-pipeline.md`; no upload, inference or archive scan. Approved endpoint, storage/cost/retention policy and human classification review are required before activation. Prints and NAS remain TODO only.

Commerce activation requires approved durable transactional persistence, Clerk test credentials, Stripe test prices/coupon mapping, private delivery packages/storage, software/file/license/refund terms, provider sandbox end-to-end verification and rate limiting. Reward claims require a confirmed email account; the campaign is configured in `commerce-runtime.ts`. Live charges are unsupported. See `commerce-server-foundation.md` and `commerce-sdk-integration.md`.

## Typography source

Otium sources read: `reskill/otium/app/layout.tsx`, `app/globals.css`, `DESIGN.md`. Product register, not the marketing Jost register:

- Hanken body: 14px / 1.5, weight 400, kern/liga/calt, base tracking −0.01em.
- Hanken block headings: 17px / 1.3, weight 600, tracking −0.005em.
- Hanken labels: 11.5px / 1.4, weight 600, tracking 0.11em, uppercase.
- Fraunces surface titles: 22px / 1.15, weight 450 light and 520 dark, tracking −0.012em; opsz 48, SOFT 0, WONK 0; loaded variable axes and normal/italic.
- Otium's 14px container / 11px control radii inform the shared surfaces. No Hack font is needed because this UI contains no code/trace content.

Earlier implementation matched the two families only. The final pass applies these exact relevant source tokens, while adapting responsive composition to this map product.

## Acceptance and delivery

Lint, typecheck, tests, production build and HTTP SSR checks must pass. Verify native Mac Chrome interactions for map gestures, compact/expanded drawer, catalog/cart thresholds, reload/return context, real exploration progress and direct SEO pages. Record screenshots and unrun physical-device/Safari checks explicitly. Inspect the diff for unrelated changes and private data. Update the draft PR, address scoped CI/review failures, and recheck the exact head and hosted preview. No merge, production promotion, purchases or persistent access changes.

See `mobile-simplification-verification.md`, `map-regression-verification.md`, `integrated-verification.md` and `seo-launch.md` for evidence and limits.
