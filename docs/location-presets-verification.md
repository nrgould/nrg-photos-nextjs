# Map and photographs verification

October 4, 2026, on Nicholas's Mac. This photo-only revision supersedes the rejected preset-heavy mobile drawer. Original worktree remains untouched; baseline `4909bd9` preserves its local changes.

## MapLibre revision (current)

MapLibre6.12 owns the explorer camera/native gestures; local workers and Natural Earth GeoJSON need no key or paid service. Native viewport rendering,12 repeated pointer drags,8 consecutive horizontal world pans, keyboard+ zoom→fractional slider synchronization, explicit Globe/World/Region stops, light/dark themes, pin selection→25%, photo drag25→75, full-height keyboard snap, gallery/lightbox navigation and focus restoration were exercised in Chrome on the Mac. Drawer remains closed initially; Next preserves that. Dateline source preprocessing removed visible northern land bands; three regression tests protect Norway/ocean, islands across the date line, polar closure and unchanged homepage geography.

The shared shadcn/Vaul drawer retains25/75/100 snaps. Compact now displays all location photographs; expanded uses balanced layouts for2/3/4 images. Command bar is rounded14px with centered separators, hidden at expanded mobile snaps. Zoom is a shadcn Popover in the bar; the slider spring settles on release. Motion does not own map or drawer transforms. Native zoom state echoes are suppressed; explicit slider requests have an independent revision. Resize recomputes drawer-aware map padding. Fallback controls are unavailable to keyboard/screen readers while the map is healthy.

Production build and SSR verification passed across all original routes/39 photographs and the closed explorer. Full lint/typecheck/test/build are repeated for the final commit/CI; see PR checks for the exact head. [Performance review](performance-review.md) reports measured payload and short gesture traces, including the additional native engine cost and limited audit coverage.

Current screenshots: [compact light](screenshots/maplibre-compact-light.png), [expanded light](screenshots/maplibre-gallery-light.png), [wrapped world](screenshots/maplibre-world-wrap.png). Older photo-map screenshots show the previous renderer and are retained as history only. Private user reference screenshots remain outside the public repository.

Physical iPhone/Safari multi-touch, assistive speech, field Core Web Vitals and long-session memory behavior remain unverified. Supported Mac UI tools exercise pointer drags and native keyboard/wheel interaction; there is no claim that these prove physical pinch behavior. The engine uses native touchZoomRotate with rotation disabled. Reduced-motion code uses zero camera duration; OS preference was not changed.

The exact accidental first Vercel deployment dpl_FoThkPbAt37kG9qqf2RuUvKSjTk6 was removed with explicit user authorization and subsequent inspection returned not found. The authorized preview remained ready; https://nicholasgouldphoto.com remained HTTP200 on its existing Netlify deployment. No merge or production promotion.

The next catalog phase was approved after this map checkpoint. Its UI and unconfigured checkout boundary are being implemented separately; verified edit associations, real comparisons, product prices, Stripe account configuration and private delivery remain required before sales can activate.
