# Map and photographs verification

October 4, 2026, on Nicholas's Mac. This photo-only revision supersedes the rejected preset-heavy mobile drawer. Original worktree remains untouched; baseline `4909bd9` preserves its local changes.

## Checks

- Lint and TypeScript passed.
- 19 tests passed, including original-photo provenance, safe contact behavior, palette tokens, geography, fractional animated projection alignment, and the retained deferred data/pipeline tests.
- Production build passed. SSR verification covers the closed initial explorer, all original routes and39 photographs, metadata, unknown/removed routes, and absence of active sample-recipe UI.
- New dependencies: Motion14, Vaul1.1.2, cmdk1.1.1, and an explicit Radix Dialog dependency. Existing utility dependencies retained. No unrelated upgrade requested.

## Browser evidence and interactions

Measured CSS viewports:390×844,320×640,844×390 landscape, and desktop1206×936. The browser's existing110% zoom was compensated during explicit phone viewport tests; reported sizes were checked from the rendered DOM. No horizontal page overflow found.

- Reload starts with no drawer. Explicit Italy pin opens25%; search/keyboard selection also opens compact. Closed Next/Back/Shuffle preserve the closed state.
- Actual handle drags25→75→100→75 work. Keyboard Home/End/arrows and click cycling work. Compact cover has deliberate center cropping; expanded photographs keep their original aspect ratios.
- Dragging upward from the photo expands25→75 without opening the lightbox. Wheel scrolling at compact expands to75. At75/full, gallery scroll reached767px while body scroll stayed0; header/close remained visible.
- Mobile pill is12px above compact drawer and hidden at75/full. Italy→Next changed location and photos to Norway, retained compact height, reset scroll0. Collapse resets gallery to its first photo. At320px the compact height is180px and measured pill/drawer gap remains12px. Landscape180px minimum keeps a real preview visible; at390×844 compact is exactly211px.
- Lightbox opens by click and keyboard, Next changes the photograph, Escape/close restores the original photo focus and drawer snap. Regression tested keyboard activation after an actual drag. Drawer close restores its originating map pin; disconnected search origins fall back to Find a place.
- Search supports keyboard selection and empty results. Nonmodal drawer leaves map controls and pins available. Desktop pill centers in the uncovered map area, addressing the independent review's tablet overlap finding.
- Motion camera verified with rapid Next/Back and End→Home zoom reversal. Observed an intermediate scale3.3874 and final scale1 with selected pin exactly at viewport center; no stale transition returned afterward. Center/zoom retarget from rendered values. Manual map pan interrupts animation.
- Both themes inspected; full-color original photos and neutral UI retained. Current browser console has no errors/warnings since final interaction verification; earlier development errors were fixed before these checks.

## Current screenshots

- [Closed map, light](screenshots/photo-map-closed-light.png)
- [Compact25%, light](screenshots/photo-drawer-25-light.png), [compact25%, dark](screenshots/photo-drawer-25-dark.png)
- [75%, dark](screenshots/photo-drawer-75-dark.png), [100%, dark](screenshots/photo-drawer-100-dark.png)
- [320px compact](screenshots/photo-drawer-narrow.png), [320px lightbox](screenshots/photo-lightbox-narrow.png)
- [Desktop gallery](screenshots/photo-map-desktop-light.png)

Earlier JPG screenshots represent superseded iterations and deferred preset work, not current acceptance evidence. User-provided critique/reference images remain outside the repository.

## Review and implementation details

Independent read-only review found tablet navigation overlap, missing drawer focus restoration and keyboard clicks suppressed after drag. All three were fixed; the last was reproduced and retested in the browser. Vaul1.1.2 does not forward its modal option to its internal Radix root; the shadcn wrapper uses a controlled inner Radix root so a nonmodal drawer does not trap focus or hide map controls from accessibility. Vaul still owns snaps/drag transforms. Captured pointer-out events cannot prematurely release a drag as the handle crosses the top edge. Pointer click suppression distinguishes keyboard/assistive activation.

## Limits and deferred work

Physical iPhone touch hardware and screen-reader speech were not available. Pointer drags, wheel/keyboard scroll, focus, and actual rendered phone dimensions were exercised in Chrome. OS reduced-motion was not toggled; Motion's reduced-motion hook sets zero duration and CSS removes drawer/pill transitions. This is a prototype for user review, not a claim of user acceptance.

Preset interactions are explicitly deferred. The private pack has21 XMP files but no genuine before/after exports; none of those private files are published. Storage, classifier inference, sales and delivery remain unconnected. No merge performed.

Vercel unexpectedly classified the new project's first automatic Git deployment as production. Only generated Vercel domains were involved, no other project/custom domain changes. That earlier artifact's removal remains pending user approval. Subsequent branch deployments are verified as previews; no production promotion is authorized.
