# Places & presets verification

Verified on Nicholas's Mac in Chrome, October 3–4, 2026. Existing worktree preserved in baseline commit `4909bd9`; prototype work is isolated on `codex/location-presets`.

## Automated checks

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 17 passed, including original-photo provenance, contact safety, palette, geography, persisted IDs, pack deduplication and classifier import validation.
- `npm run build`: passed from a clean generated cache. An initial sandbox-restricted CSS worker failure was cached; clearing only this checkout's generated `.next` directory and rerunning with approved local-process access resolved it.
- `PREVIEW_URL=http://127.0.0.1:3118 node scripts/verify-ssr.mjs`: passed against the production build, including the new explorer and all original routes, 39 photographs, metadata and removed-route behavior.
- Storage/classification dry run generated successfully; zero uploads or inference requests.
- `git diff --check`: clean. Reviewed new changes against the preserved baseline and the inherited redesign against main. No credentials, signed Notion URLs, raw preset files or buyer ZIP included.

## Browser interactions

- Globe intro settles into map; manual globe/map selection, all three zoom stops and recenter work.
- Map pans with keyboard arrows (selected marker position changed) and pointer dragging.
- Back/Next/Shuffle change location and corresponding original photograph/recipe; search finds Norway; empty search state checked.
- Original fullscreen lightbox opens, arrow navigation changes photograph, Escape dismisses.
- Favorite photos/locations and sample pack selections survive reload; removal works; repeated curated additions deduplicate. Export downloaded a JSON sample selection with `purchasable: false`, not a Lightroom preset.
- Collection opens as a centered dialog, closes with Escape, with no sidebar. Contact link reaches the preserved form/draft fallback; no email sent.
- Full real Signature Collection lists 21 names. Film filter yields Classic Film and Muted Film; selecting a preset updates its preview heading.
- Comparison demo pointer drag changes split to 59%; mobile-width drag changes it to 76%. Arrow key changes one percentage point; Home/End expose 0/100%. Clear same-image notice stays visible. No visual filter or fabricated preset effect.
- Light/dark views checked at desktop and 390×844 viewport. Fixed the initially overflowing mobile CTA and scaled map labels. Mobile comparison and catalog remain readable. Viewport override reset afterward.

## Evidence

- [Light explorer](screenshots/explorer-light.jpg), [dark explorer](screenshots/explorer-dark.jpg), [globe](screenshots/explorer-globe.jpg)
- [Centered preset dialog](screenshots/preset-pack.jpg)
- [Full catalog](screenshots/signature-collection.jpg), [split interaction demo](screenshots/split-comparison.jpg)
- [Mobile light](screenshots/mobile-light.jpg), [mobile dark](screenshots/mobile-dark.jpg), [mobile split demo](screenshots/mobile-comparison.jpg)

## Limits

The real Desktop pack contains 21 parsed XMP files but no before/after photographs. Only names/order/categories are included. Exact applied-preset history and genuine paired exports are required before enabling actual comparison results. The map-linked recipes and custom-pack checkout remain labeled samples. Checkout, private delivery, R2 provisioning and JEV inference are not connected. Physical touch hardware, screen-reader speech and an OS reduced-motion setting were not exercised; native controls and reduced-motion code were inspected. No merge or production deployment performed.
