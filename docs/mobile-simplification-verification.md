# Mobile simplification verification

October 4, 2026. Bounded follow-up on the existing draft PR. Nicholas's three Library screenshots were downloaded through the authorized Library transfer helper and inspected as pixels before editing. Originals and browser captures remain outside Git in `../references/mobile-simplification/`.

## Before and after

| Severity | Before | After |
| --- | --- | --- |
| High | Drawer could stop at another snap instead of dismissing; blanket drag exclusions prevented pulls from content. | A deliberate downward pull dismisses from 25%, 75% or 100%. Vaul retains transforms, velocity and snaps. Native scrolling owns gestures that begin in scrolled content; at the top, downward pulls belong to the drawer. The handle always permits dragging. |
| High | Search, collection branding and repeated explanation consumed most of the 75% preset drawer. | Search removed. Title, price, category and Add all form compact controls. One scrolling body shows about 5.5 rows at 390×844; its header scrolls away. |
| Medium | Grid lines wrapped into a visible center artifact on the globe. | Explorer grid layer, source and generation removed for both projections. Land and country borders remain. Original homepage globe is preserved. |
| Medium | Cart's repeated ownership narration and fixed summary left little list space. | Removed narration; seven rows fit at 75%. Totals follow the list in the same scroll surface. Price, discount, disabled checkout and error states remain. |
| Medium | Map contact and filter buttons added unwanted controls. | Both removed. Existing site contact route/navigation remains. |
| Low | Decorative challenge headings and repeated local-progress explanation. | Plain labels and concise state copy; unavailable reward and planned dog challenge remain explicit. |

## Verification

- All 131 tests, ESLint, TypeScript and production build passed. New tests cover scrolling ownership and distance-based dismissal at all three heights.
- Production HTTP verification passed original routes, all 69 photo/location/preset detail routes, metadata/noindex gates, 404s and unavailable commerce. Legacy `/presets?query=nomatch` still renders all 21 presets. SSR checks also assert removed map contact/filter and preset search controls stay absent.
- Native Mac Chrome at 390×844: downward drags dismiss 25%, 75% and 100%; catalog content at its top also dismisses. Scrolled catalog stays open, while a handle drag dismisses. Photo content scrolls at 75% and can then dismiss from its handle. Full-height photo dismissal repeated against the production build.
- Reopening focuses the resize handle; dismissal restores the originating control (or Find a place for direct location entry). Photos/Presets/Cart retain place, selection and category/detail navigation. Catalog detail returns to its category list.
- Cart's 21 selections remain $41.79 subtotal, $8.36 discount, $33.43 total. Native scrolling reaches totals and disabled checkout. No payment attempted.
- Screenshots inspected: grid-free globe in light/dark themes, dark flat map retaining borders, catalog, cart, 320×640 narrow phone and 842×390 landscape. No horizontal overflow at 320px. Landscape content scrolls past its header.
- React review: gesture transients remain refs; no per-frame React state or new network work; Vaul owns drawer transforms; SSR links, keyboard controls and real error states remain.
- `git diff --check` passed. Changes contain no private screenshots, preset payloads, credentials or dependency additions.

## Limits

Physical iPhone touch, mobile Safari, pinch interactions inside the drawer, and DevTools Animations at 10% speed were not run. Mac native pointer/scroll verification and touch-action boundary rules do not replace those device checks. Existing commerce activation, verified photo-to-preset associations and authentic before/after assets remain blocked on the inputs documented in the spec. This remains a protected, noindex preview; no merge or production/domain/security change.

## Local evidence

`globe-light-after.png`, `globe-dark-after.png`, `flat-dark-after.png`, `presets-after.png`, `presets-320-after.png` and `cart-after.png` are in the private reference directory above. Hosted preview evidence is recorded in the PR after exact-head CI and deployment verification.
