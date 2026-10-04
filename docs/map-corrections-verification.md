# Map correction checkpoint — October 4

Stage 1 only. Commerce remains paused; the approved small filtering follow-up is specified in `map-filters-spec.md`.

## Changes and evidence

| Reported issue | Correction | Verification |
| --- | --- | --- |
| Italy and other pins misplaced | Removed geographic pixel offsets. Exact projected reference dots connect to separated photo callouts. Audited all four references; Norway moves from unsupported Tromsø to documented Lofoten. | Primary-source audit in `map-location-audit.md`; Italy/Austria country-membership and border-deviation tests. Regional collections are explicitly not camera GPS. |
| Empty continent-only map | Local 1:50m land and shared country borders, 242 ranked country labels, 170 sparse city labels at closer zoom; native label collision handling and local Hanken glyphs. | Source/license/payload details in `src/data/README.md`; dateline, pole, deterministic generation and compressed-budget tests. No tile key or remote glyph endpoint. |
| Green search rectangle | Scoped every relevant semantic surface token to the explorer's neutral palette; forest green remains an accent. | Light/dark browser inspection of command dialog and selected rows. |
| Photos jump from strip to grid | Same photo elements continuously interpolate layout from Vaul's rendered drawer height; no second gesture owner or React state per frame. | Real Mac pointer drag in a temporary local measurement harness: 35 sampled drag/settle frames, 23 distinct rounded first-photo widths, 83.49–171.71px before final 172.99px settle. Median frame interval 8.3ms, p95 9.7ms, max 19.5ms. This short development trace includes the diagnostic observer and is not a general performance benchmark. Harness removed before production build. |
| Zoom panel and distorted fill | Removed extra panel/headings; actual-width rounded fill, bounded spring, whole-command-bar anchor, Globe/Map icons, 150ms enter/100ms exit with keyboard/reduced-motion bypass. | Six stops, Home/End/arrows, rounded intermediate fill, Escape dismissal; measured horizontal center difference below 0.001px. |
| White line above drawer heading | Global focus outline surrounded the full-width resize button. Focus indicator now outlines only the small grip. | Keyboard-focused grip inspected; no full-width line, keyboard resizing retained. |
| Location heading font | Fraunces only for location headings; Hanken remains for controls, captions and viewer. | Italy heading and computed font inspected in browser. |
| Lightbox font/corners | Explicit Hanken portal typography and rounded actual image bounds with natural aspect ratio. | Original portrait image, navigation, Escape and focus return. |
| Contact/bar misalignment | Shared flex row, 54px height, 14px radius, safe-area inset and compact-drawer lift; both hidden/inert at expanded snaps. | Equal measured vertical bounds in closed and compact states; narrow, landscape and desktop checks. |

## Checks and limits

Native Node 24 ARM64: lint, typecheck, 23 tests, production build and rendered-HTML verification pass. Build refresh removes stale generated route references from the paused commerce branch. SSR remains request-time on all content routes; 39 original portfolio photographs remain intact.

Browser checks use supported Mac Chrome UI at mobile, narrow, landscape and desktop sizes. Pointer drag is real input; no physical iPhone/Safari two-finger pinch or remote-device testing is claimed. Source shapes are generalized regional geography, not surveyed navigation data. Country/city labels are geographic context, never evidence of photographed places. The Arctic boat's exact location remains unverified.

Private user screenshots are stored outside the repository and are not published. Committed evidence contains only the authorized portfolio prototype.

## Deferred design idea

A Lucide Leaf beside future exploration-challenge progress, potentially with a subtle unlock flourish, is a design idea for the deferred reward stage. It is not a functional map/filter icon and does not implement rewards in this checkpoint.
