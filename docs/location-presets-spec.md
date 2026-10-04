# Places and presets specification

Authoritative scope: October 3 daily note task “Add presets to map locations, connect to edits that I used”, all nested items, plus Nicholas's subsequent corrections. The current acceptance criteria below supersede earlier screenshots and layout drafts.

## Foundation

Continue `nrgould/nrg-photos-nextjs` from the existing `photo_portfolio-redesign` worktree, branch `codex/photography-redesign`, head `f078128`. Its local refinements are preserved in baseline commit `4909bd9` in an isolated checkout. The original worktree is untouched. Supported Codex task discovery did not return the original photography session; filesystem and git independently confirmed its worktree. Preserve all original photos, provenance, SSR via `connection()`, original routes and contact behavior.

## Current experience

- `/explore` is an edge-to-edge, full-viewport map. No visible page title, promotional copy, page header/footer, permanent navigation sidebar or below-map sections. All controls float over the map.
- Desktop: an inset, nonmodal photo canvas floats on the right. Mobile: the same photo content becomes a bottom sheet with expand/collapse and close/reopen. The map remains usable. The selected location is projected into unobscured space.
- No Polaroid treatment or stacked-photo decoration in the explorer. Rounded, stable-aspect Next.js Images with responsive sizes. The photo is primary inside that canvas: original full-color image, thumbnail selection, save action, fullscreen viewer and associated edit details. Favorites and preset browsing use intentional, bounded overlays. No competing permanent sections.
- Black/white/neutral gray map, backgrounds, cards and controls in both themes. Dark green is reserved for restrained core/primary/selected accents. No light green accent or green wash. Preserve photograph colors.
- Minimal, cohesive shadcn controls. Use actual Better UI and Emil skill guidance: 44px touch targets, visible keyboard focus, suitable contrast, reduced motion, instant theme switching, subtle press feedback. Optional glass/texture from the original note is subordinate to this clean treatment; no faux tactile/ribbed zoom widget.
- Zoom follows the latest explicitly exact slider attachment: dark rounded capsule, inset white filled track, black circular thumb with white rim and six evenly spaced snap dots. Six functional steps (World, Continent, Region, Area, Near, Local), native keyboard support, center maintained. This latest reference supersedes the temporary minus/range/plus direction.
- Otium product typography: actual Hanken Grotesk and Fraunces configuration and relevant tokens, described below. No hero title on the map.

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

## Functional acceptance

1. Map locations expose photo-linked edit recipes and a top Presets action. Original recipe associations remain labeled samples until actual edit history is verified.
2. Select individual sample recipes or curated sets; deduplicate; remove; review; export an explicitly non-purchasable sample manifest. Real sales need approved assets, prices/license, checkout and entitlement. The 21-item real catalog is distinct from sample map recipes.
3. A small pill floats at bottom center with Back / Shuffle / Next buttons and dividers between them. Back/Next and Shuffle change the location and photographs. Shuffle avoids the current location. Cmd/Ctrl K opens searchable location/pack navigation, with usable empty results. Native buttons remain keyboard operable.
4. Brief first-visit globe animation eases toward the initial location, then becomes a flat map. Interaction skips intro; reduced motion/repeat visits skip it. Globe and flat modes remain selectable. Flat map supports drag and arrow-key pan, discrete zoom and recenter.
5. Save/remove photo and place IDs locally; restore validated state; use a centered collection overlay. Storage failure preserves in-memory usability. No preset payload in localStorage.
6. Contact remains available from the canvas and desktop floating control, leading to the preserved contact form/draft fallback.
7. Existing optimized derivatives remain local. A deterministic R2-oriented manifest/batch plan demonstrates a cheap non-Supabase storage boundary, without provisioning or transmitting photos. Private originals/presets stay private; approved derivatives and signed entitled downloads are the proposed production split.
8. JEV remains an unconfigured adapter until its actual image endpoint, contract, limits, cost and retention are confirmed. Working batch plan/result validation includes stable photo identity, tags, confidence and pending human review. Do not represent fixtures as inference or infer edit usage from appearance. See `photo-pipeline.md`.

## Real pack and before/after

The read-only Desktop discovery found **2026 Signature Collection**: 21 numbered XMP presets, PDF/HTML install guide, buyer ZIP and handoff. All XMP files parsed successfully. Public catalog exports only name, order, category and a stable public ID; no raw preset settings, private source names, contact metadata or buyer ZIP.

List all 21 presets, filter by Landscape & travel / Nature / Film / Portrait, select a preset and open its comparison. A draggable line must reveal aligned exports of the same photograph before and after that named preset. Support pointer/touch, arrows, Home/End and visible focus; preserve image color and crop alignment.

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

Run lint/typecheck/tests/build and SSR checks. Browser verify fullscreen bounds, no page overflow, canvas/sheet close/reopen/expand/collapse, map while canvas open, both themes, zoom/search/favorites/packs, real catalog, comparison, lightbox and contact. Capture final desktop/mobile screenshots. Use a draft PR and babysit CI/review without merging. Vercel preview is authorized; no production promotion, purchases, security weakening or private-image transmission.
