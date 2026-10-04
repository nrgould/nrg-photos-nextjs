# Places & presets — prototype specification

Source: Nicholas's October 3, 2026 daily note, task “Add presets to map locations, connect to edits that I used”; fetched live October 3, including all 13 nested subtasks and two reference images. Source URL: https://app.notion.com/p/3ee16e8b0b9b817abb0cd59004f002de

## Foundation and preservation

Continue `nrgould/nrg-photos-nextjs`, existing worktree `/Users/nicholas/Desktop/dev/NRG_PHOTO_NEXTJS/photo_portfolio-redesign`, branch `codex/photography-redesign`, commit `f078128`. Preserve the current uncommitted shadcn/palette/lightbox/photo refinements in a separate baseline commit in an isolated checkout. Do not mutate that worktree. Keep request-time SSR, all 39 original photographs and their provenance, collections, polaroid stacks, viewer, and contact behavior. The supported task tools did not return the original photography session; git confirms the implementation and worktree independently.

## Outcome

A dedicated `/explore` experience connected from the existing header and Places section. Visitors move around a photographic map, inspect photographs and associated edit recipes, save places/photos, and assemble a preset pack. Keep the existing portfolio routes and functions accessible.

## Complete requirement mapping and acceptance

1. **Presets at locations and top CTA:** location detail shows linked sample edit recipes and their specific original photograph; “Build a preset pack” at the top opens the same centered collection dialog. Actual Lightroom/XMP history is absent: never claim the samples are the presets Nicholas used.
2. **Custom and pre-curated packs:** add/remove individual recipes at each location; add curated Alpine / Northern / Complete selections; deduplicate shared recipes; review contents and export a sample pack manifest. Purchase preview explicitly has no payment or download entitlement. Real checkout waits for preset assets, prices, license and payment configuration.
3. **Cadence/Otium fonts:** reuse Otium's Fraunces + Hanken Grotesk pairing, scoped to the explorer; existing portfolio typography stays intact. Grounded in `reskill/otium/app/layout.tsx`.
4. **radiocast.co:** clean, pannable geographic canvas with compact persistent controls and a location/photo detail surface. The user prefers its earlier restrained map treatment; do not copy the newer glass-heavy design. Public URL inspected; original version is not available as an exact visual source.
5. **Command bar:** Back, Next and Shuffle operate on locations; shuffle never returns the current location when alternatives exist. Keyboard-operable buttons and a searchable command dialog (Cmd/Ctrl K) navigate places and packs. Do not hijack typing or dialog arrow keys.
6. **Cheap storage, not Supabase:** prototype uses existing local optimized assets. Production proposal: S3-compatible Cloudflare R2, separate private originals/preset assets and public approved derivatives; stable object keys, signed short-lived downloads after entitlement; no buckets, paid resources or credentials created. Include a validated manifest planning script, dry-run only.
7. **JEV classification at scale:** reviewable queue fixture driven by the existing photo manifest; batch planning and result validation with photo identity, tags, confidence and review status. Keep provider adapter unconfigured until JEV's image-capable contract, credentials and costs are confirmed. No private original uploaded; do not relabel deterministic fixtures as model inference. Human-approved geography and preset provenance are distinct from inferred visual tags.
8. **Globe and flat map:** first visit begins with a brief spinning globe, eases toward the first location, transitions to a flat map centered there. Skip on interaction, reduced motion or repeat visit. Both modes remain selectable. Drag and keyboard pan flat map; maintain location selection while switching modes.
9. **Contact preserved:** existing contact route/form plus direct explorer contact link.
10. **Liquid Glass?** optional glass control treatment, opaque default, with strong contrast and solid fallback. No glass over important image content.
11. **Zoom slider with snap points:** labeled World / Region / Local discrete steps, native keyboard-operable range, visible ticks; selected location stays centered when zoom changes, reset/recenter available.
12. **Favorites cart / shadcn collection dialog:** reuse the existing Base UI/shadcn Dialog primitive with a centered panel variant (later no-sidebar instruction supersedes the original sidebar reference). Separate Saved places/photos from selected presets in the same collection dialog. Persist IDs locally, validate restored state, remove items, return to selected place/photo. Empty and unavailable-storage states are usable.
13. **Texture:** restrained CSS grain/ribbing on the zoom/control surface, using design tokens, no external texture dependency. Honor the reference's tactile surface without compromising contrast.

## Model and implementation plan

1. Reuse `travelPlaces`, `Photo`, `photo-manifest.json`, `globeFrame` and local geography; extend globe geometry with flat projection rather than adding a map library/provider. Add one explorer composition because the homepage `TravelGlobe` is an embedded polaroid section, not a full browsing workspace; preserve and link it. Reuse `PhotoImage`, `Lightbox`, `Button` and `Dialog`.
2. Add one typed preset catalog: stable recipe IDs, photo references, place references, honest sample provenance, curated pack membership. Store only user-selected IDs and preferences; derive counts and contents.
3. Add explorer route, map component and client composition. Use localStorage only for favorites/selection preferences; no backend or global state framework.
4. Add manifest-only storage/JEV planning and validation CLI; never perform network uploads or inference. Document the live service boundary clearly.
5. Verify catalog integrity, deduplication, malformed persistence, shuffle, flat projection, batch idempotence; run lint/typecheck/test/build and SSR script. Browser-test globe/flat, zoom/pan, search, favorites persistence/removal, pack assembly/export, viewer, responsive layout and contact navigation. Screenshots go only to the authorized repository.

## Plan integration audit

### Scope

Photography project; five steps above, pre-implementation. Reviewed PRODUCT.md, DESIGN.md, AGENTS.md, map/place/photo models, Header, homepage, PhotoImage, Lightbox, Button and Sheet. QMD index unavailable (read-only database error); repository contracts are the ground truth, not Cadence/Otium architecture.

### Red flags

No unresolved A/B/C/D issues in the proposed plan. Existing primitives and their reasons for extension are named above. No new persistence/service infrastructure, duplicate gallery or photo data, runtime classifier claim, or payment flow.

### Recommendation

Proceed with repository-grounded coverage. Reuse the current components and canonical data; keep the new composition and domain catalog focused. Vault coverage remains unavailable.

## Release limits

This is a working interaction prototype, not a commercial preset launch. Missing: verified photo-to-edit provenance and paired exports, approved preset delivery and pricing/licensing/payment setup, provisioned storage, JEV API contract/credentials and evaluated classification results. No merge, production deployment, purchase, paid cloud provisioning or bulk image transmission is authorized in this task.

## Subsequent user requirements

- Light and dark modes with a visible persisted toggle; check map, detail, dialogs and mobile contrast in both.
- Prioritize shadcn functionality; apply local `better-ui` and `emil-design-eng` skills. Retain token-only styling, 0.96 button press, named transitions, reduced motion, and instant theme switching.
- A Vercel **preview** is authorized, using the newly approved `nrg-photos-nextjs` Vercel project/integration. No production promotion, paid service or security changes. Verify the branch/commit and actual browser accessibility.
- Reference images inspected locally: discrete slider dots on a tactile track; Radio Cast search/map/favorites controls with a textured player surface. No private source screenshots are committed.

- Latest direction supersedes the original sidebar subtask: **no sidebar**, permanent or slide-out. The map fills the content width; selected photography and edits form an inline section below it. Saved items and packs use a centered, bounded dialog. Transparent top map controls are acceptable.

## Signature Collection follow-up

The Desktop pack was inspected read-only after Nicholas identified it. All 21 XMP documents parsed successfully. The public catalog contains only preset names, order and categories from the pack listing. Raw XMP files, buyer ZIP, ownership/contact metadata and private source names are excluded from this public repository.

The full collection is browsable below the location story, with category filters and a selected-preset preview. This real catalog is distinct from the explicitly illustrative map recipes and custom-pack experiment. The source handoff confirms that before/after exports have not been made; no matching pairs exist in that pack. Do not infer editing history from file names or apply CSS filters to fabricate it.

The split viewer uses a native range input (pointer/touch, arrows, Home/End), a 44px visual handle, visible keyboard focus, readable labels and a responsive uncropped image stage. Its current opt-in interaction demo shows the exact same portfolio photograph on both sides. To enable an actual preview, supply same-photo, same-crop before and preset-applied exports plus a verified preset ID and source-photo ID in `verifiedPairs` in `SignatureCollection.tsx`. Publish only approved image derivatives, never the commercial preset payload. Before/after rendering remains blocked on those genuine exports.
