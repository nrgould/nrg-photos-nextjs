# Map and filter regression verification

This pass supersedes the continuous zoom/projection and collision-layout claims in `globe-hierarchy-verification.md`. Scope and observed root causes are in `map-regression-plan.md`.

## Implemented behavior

- A globe pan preserves the spherical endpoint and its apparent scale, including the negative raw zoom required at high latitude. Only deliberate zoom chooses a projection, with hysteresis and a 240ms eased transition. Keyboard and reduced-motion transitions are immediate.
- Country anchors represent the extent of their photographed regions. Selecting United States frames Lake James and Raleigh; zooming out returns the stack to that same region. Unknown-location fallback photos are not assigned invented child coordinates.
- Existing marker callouts remain fixed during gestures. At rest, the bounded layout preserves valid 48px targets, then moves only inner callouts over 180ms when separation or viewport visibility requires it. Membership enters over 180ms and exits over 120ms; exits become inert immediately. Native MapLibre host transforms and occlusion remain the map engine's responsibility.
- Filters use actual shadcn Popover and Select components for Subject and Format. Counts and reset use the same eligible-photo data as map markers, search and drawer. The source has enough evidence for Places & landscapes / People and image orientation; no camera settings or unverified edit metadata are invented.

## Browser evidence collected during implementation

Supported Mac Chrome, local development server:

- At 390×844, three deliberate globe pans moved latitude43°→84°→−68° while projection remained0 and apparent zoom remained0 (floating point error below1e−12).
- Keyboard ArrowUp/ArrowDown preserved apparent zoom while changing latitude and reversed back to the original camera latitude.
- United States selection framed both original photographs above the compact drawer. Zooming out regrouped the stack in North Carolina, without an empty former political-centroid position.
- Italy selection ended with four distinct Dolomites targets and short leader lines. Native pan and reverse preserved all four callout offsets; Seceda selected the matching photograph. Hallstatt adjusted at rest near a viewport edge, as intended.
- Rendered filter popup measured304px width, 14px radius and 12px padding; Select controls measured 44px height and 8px radius. People returned 3 photos / 2 locations; People+Horizontal returned 1 photo / 1 location; Clear all restored 11 photos / 9 locations and focus to Subject.
- Dark 320×640 filters and a nested Select menu in 842×390 landscape fit without clipping. Nested Escape and reset focus were exercised.
- Native wheel testing exposed a MapLibre 6.12 isolated-wheel event with absent original-event metadata. This was caught before push; the final wheel/interruption acceptance below passes.

## Final acceptance

- `npm run lint`, `npm run typecheck`, all **63 tests**, `npm run build` and the repository SSR script pass on native ARM64 Node 24.20.0. All existing portfolio/contact routes retain server-rendered HTML; unknown collections and removed prints return 404.
- Fresh production server at 390×844: repeated sphere drags preserve projection 0 / apparent zoom 0; isolated wheel zoom reaches the flat endpoint; selecting USA frames both regions; Raleigh selects its own photograph and regrouping remains in the same photographed region.
- At latitude 85°, deliberate zoom-stop click followed immediately by drag exercised the actual interruption branch: diagnostic interruption count 1, apparent-scale error 0. A subsequent wheel zoom-out at the flat minimum returned to globe with apparent zoom 1.1e−14 and raw zoom −3.52026. No prolonged partial projection remains after the gesture.
- Italy's four callout assignments remained byte-for-byte identical through pan and reverse. Seceda selection opened its own photograph. Tab after Cadini skipped all four offscreen Norway/US markers and reached Contact Nicholas; visible targets remained keyboard accessible.
- Production filter intersection/reset passed, including Subject focus restoration. Desktop 1200×800 kept the photographed extent clear of the contextual drawer. The earlier dark/narrow/landscape checks use the same final filter code.
- Independent review checked all camera and marker lifecycle paths, 40 targeted tests, the 144-case filter matrix, and 15 real MapLibre helper latitude/scale cases. No remaining source findings. The committed engine regression directly exercises MapLibre's reverse-transition constraint initialization.
- No new production browser errors were recorded. Earlier development/HMR errors in the persistent console history predate this production pass.

Screenshots: [stable globe](screenshots/map-regression-stable-globe.png), [USA children](screenshots/map-regression-usa-children.png), [USA regroup](screenshots/map-regression-usa-regroup.png), [Dolomites](screenshots/map-regression-dolomites.png), [high-latitude endpoint](screenshots/map-regression-high-latitude.png), [filters](screenshots/map-regression-filters.png), [desktop](screenshots/map-regression-desktop.png).

CI and immutable Preview verification will be recorded after push.

Physical iPhone pinch, Safari and a 10% slow-motion animation tooling pass have not been verified. No production promotion, domain/DNS mutation or merge is part of this checkpoint.
