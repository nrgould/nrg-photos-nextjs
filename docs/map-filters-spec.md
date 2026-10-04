# Map filters proposal

Proposal only, 2026-10-04. No implementation in this pass. The current correction preview remains independent of this feature.

## Metadata audit

The 11 photographs in `travelPlaces` have verified asset dimensions and existing collection membership. Orientation describes the image shape, not its subject. Regional grouping follows `places.ts`; pins are references, not camera GPS (see `map-location-audit.md`).

| Location | Horizontal (`width > height`) | Vertical (`height > width`) | Total |
| --- | --- | --- | --- |
| Austria | 2 | 0 | 2 |
| Italy | 0 | 4 | 4 |
| Norway | 0 | 3 | 3 |
| North Carolina | 1 | 1 | 2 |
| All | 3 | 8 | 11 |

No mapped image is square. Existing collections are Far from here (8), Everyday stories (1), and People & places (2). Defer collection filtering: those sparse groups add little to the initial location/orientation combination. Do not infer subject, season, color, camera, lens, capture date, or exact shooting location from filenames or appearance.

## Smallest useful interface

- Add one existing-library filter icon button to the command bar, with a 44px target, tooltip “Filter photographs,” and accessible name that includes the active count. Use `aria-expanded`/`aria-controls` for its panel state.
- Open an anchored shadcn/Base UI Popover containing **Locations** (four labeled checkboxes) and **Orientation** (Any, Horizontal, Vertical radio options). Constrain it to the viewport with internal scrolling on short screens; avoid another draggable drawer layered over the photo drawer.
- Show a stable “8 photographs · 3 locations” result summary, **Clear all**, and **Done**. Update filters immediately; Done and Escape close the panel without discarding changes. Restore focus to its trigger. Opening filters never opens the photo drawer.
- The button badge counts active filter groups, **0–2**, not photos or checkbox selections. A location subset contributes one; a non-Any orientation contributes one. At zero omit the badge. Checked states and the badge provide static feedback independent of animation.
- Initial state and Clear all: all four locations checked, orientation Any. An empty location selection means **no locations**, never implicitly all. Clear all is disabled when already at defaults. Omit Square until actual square images exist.
- Keep the current command-bar placement and visibility rules. Reuse project tokens, icon stroke, checkbox/radio primitives, focus outlines and spacing. No new visual system or dependency is needed.

## One result set across the experience

Derive filtered photos per location once. Combine location membership **AND** orientation; selected locations are **OR** alternatives. A location is eligible only if it has at least one matching photo.

Use this same derived set for map markers, search candidates, Back/Next/Shuffle, drawer photos/counts, and lightbox sequencing. Search remains a navigation query within eligible locations; it must not silently bypass filters. Keep original photo order and stable photo identities (`src`), never carry a numeric index into a different filtered array.

Preserve the selected location, drawer open state, and snap when the location remains eligible. Reset gallery scroll only if its photo list changes. If the selected location becomes ineligible, clear selection and close its drawer; leave the camera where the visitor put it. Do not auto-select another location or fly the camera because a checkbox changed. The next explicit marker/search/navigation action selects an eligible location normally. With no current selection, Next selects the first eligible location, Back the last, and Shuffle any eligible location. With one eligible location, disable navigation controls that cannot change location.

If a lightbox is open, filter controls remain unavailable beneath its modal. Defensive reconciliation uses photo identity: preserve a still-matching photo, otherwise close the viewer and return focus to a surviving drawer control or filter trigger. Never show a removed photo or an out-of-range index.

## Empty results and verification

Keep filter options available even when a combination yields zero. Show “No photographs match these filters” with a Clear all action in both the panel and a compact map status area. Show no markers; disable Back/Next/Shuffle; keep the photo drawer closed. Clearing filters restores eligible markers without unexpectedly opening photos. Announce the final result summary through a polite live region without moving focus from the control being changed.

Acceptance checks: default 11/4; Horizontal 3/2; Vertical 8/3; Austria + Vertical 0/0; Norway + Vertical 3/1; no locations 0/0; Clear all 11/4. Verify stable selected location, removal of invalid selection, drawer/lightbox counts and sequence, filtered search, navigation wrap, keyboard focus/escape, touch targets, 320px width, short landscape viewport, dark mode, and reduced motion.

## Design guidance applied

[Better UI](../../../../../../.agents/skills/better-ui/SKILL.md): keep existing components/tokens; one contextual icon library; static active-state cues; immediate or at most 150ms color/opacity feedback for frequent changes; interruptible transitions with named properties.

[Emil Design Engineering](../../../../../../.agents/skills/emil-design-eng/SKILL.md): decide whether motion serves a purpose; keyboard filtering is immediate; an optional pointer-open popover transition is brief and uses the primitive's trigger-based transform origin; reduced motion removes position/scale changes. Do not stagger filter rows or animate every result out and back in.

Metadata counts were calculated from the current exported `travelPlaces` with Node 24. UI behavior above is proposed, **not browser-verified or implemented**.
