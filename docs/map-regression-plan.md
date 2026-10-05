# Map interaction correction — October4

Commerce/rewards work is preserved on the local-only `codex/commerce-rewards-wip` branch at573eefc. SEO remains in `staging/seo` outside the repository. This checkpoint changes only map interactions and filters, then resumes the approved feature plan.

User reference JPEG shows a prolonged intermediate projection during a pan. The filter PNG shows an oversized square panel with country exclusions and custom orientation chips. Both actual images were inspected locally and remain outside Git.

| Severity | Before | Intended after | Why |
| --- | --- | --- | --- |
| HIGH | Raw zoom drives continuous globe/Mercator morph; globe pan changes raw zoom by latitude compensation, while a zero clamp blocks negative compensation | Stable sphere during rotation; explicit zoom intent chooses a short, interruptible transition with hysteresis and latitude-correct scale limits | Preserve geographic orientation and prevent pan from changing mode |
| HIGH | Country stacks sit at political centroids; global level switch removes USA stack while photographed East-Coast children are outside the viewport | Stack represents its actual photographed child extent; selecting it frames those children; grouping returns to that same region | Expansion must explain where photographs are, without losing them |
| HIGH | Collision solver chooses one of eight offsets every rendered frame and membership is mounted/unmounted immediately | Stable assignments during gestures; controlled inner-marker movement and membership transition, native host transforms untouched | Prevent jitter without delaying map gestures |
| MEDIUM | Direct Base UI controls styled as a large custom filter panel; country list duplicates map search | Compact actual shadcn controls for grounded subjects and format, clear counts/reset, no invented metadata | Make each choice useful and reduce visual load |

Apply Better UI and Emil Design Engineering from their actual local SKILL.md sources. Feedback for frequent filtering stays immediate; use named-property transitions, reduced-motion/keyboard handling and44px hit areas. No decorative stagger, competing map transforms or per-frame React geometry.

Verification must include sustained vertical/horizontal globe drags and reverse paths, intentional zoom in/out and interruption, USA→Raleigh/LakeJames, Italy/Dolomites, regrouping, rapid dense-marker navigation, narrow portrait/landscape, light/dark, filters empty/reset/focus, lint/typecheck/tests/build/SSR and independent review. Automated green checks alone do not establish visual polish. Physical iPhone pinch and slow-motion animation tooling remain explicitly unverified unless exercised.

## Reproduced before changes

Supported Mac Chrome at390×844: Home selected globe0; two vertical down drags and one up drag, with no zoom input, changed the view to flat Europe. Reopened slider reported2.23. This matches the native globe latitude compensation described in installed `globe_utils.ts` and the zero-clamped custom constraint.

Browser computed styling independently confirmed the filter cascade failure: popup radius0px, width288px and padding10px despite component CSS requesting14px/304px/12px. Tailwind utilities have higher cascade-layer priority than `@layer components`; `rounded-lg` resolves to the portfolio's zero-radius token. The fix must set deliberate utility overrides and be checked in rendered styles, not merely inspected in source.
