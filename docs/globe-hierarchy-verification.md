# Globe and location hierarchy checkpoint

The fixed long diagonal thumbnail offsets in the supplied screenshots made pins look geographically displaced. Markers now retain true geographic anchors and use short callouts (28px normally, under 40px diagonally), with deterministic collision relaxation. The 48px photo targets remain separate in the verified Alpine and small-globe cases. Secondary labels choose an unobstructed side or defer to hover/focus; accessible names always retain location and count.

One MapLibre projection expression blends vertical perspective into Mercator across the Globe–World interval. The existing six slider positions now map to actual geographic engine zooms 0, 1, 3, 5, 8 and 12, allowing region and local browsing. Explicit native camera constraints prevent the Mercator viewport-height minimum from trapping tall screens above the globe stop. Native zoom and camera easing own intermediate frames; no React per-frame projection state or repeated projection swapping. Camera padding stays zero; explicit selection uses a temporary camera offset, so filters can stop motion without retaining an obsolete drawer offset.

Four country stacks break into nine source-verified regional references near Region zoom, with hysteresis to avoid oscillating at the boundary. Country aggregates use Natural Earth country references. Detailed nodes use the source audit in `map-hierarchy-spec.md`. Italy’s prior northern pin intentionally represented the Dolomites; the detailed view now distinguishes Braies, Seceda, Santa Magdalena and Cadini. Coordinates are representative areas, never claimed camera GPS. Current source records also support Tromsø separately from Lofoten.

The approved palette uses subtle blue-gray water and warm neutral land in light mode, deep blue-gray water and charcoal land in dark mode. These four map-only tokens do not recolor neutral controls or the photographs. No external tiles, terrain, glyph service or new imagery is introduced.

## Browser evidence

Supported Mac Chrome checks:

- Tall 390×844 globe, short 842×390 globe, Globe/World slider changes, and regional country selection.
- Italy country selection opens its four-photo collection and reveals detailed regional markers; Seceda selection scopes its drawer and lightbox to the correct one photo.
- Measured all five visible Alpine marker rectangles after collision relaxation: no overlap at 48px targets.
- Search preserves “North Carolina” and “Dolomites,” while adding exact regional names.
- Filtering out Raleigh closes that leaf instead of silently switching to still-eligible Lake James. Default counts are now 11 photos / 9 regional locations; Horizontal 3/2; Vertical 8/7. Four collection checkboxes remain compatible with the previous filter checkpoint.
- Empty recovery, stable photo source identity, visible selection and accessible count/name semantics remain intact.

Actual MapLibre expression evaluation tests cover globe, halfway projection and Mercator states. Pure tests cover invertible zoom stops, tall-screen constraints, hierarchy partitioning/provenance, filtered leaf removal and dense marker placement. Physical iPhone/Safari two-finger pinch, screen-reader speech and field performance are not claimed. The local geography remains a simplified regional context, not a detailed street or terrain map.

Final production checks: lint, typecheck, all 42 tests, production build and SSR route checks passed. Production Chrome confirmed secondary-label decluttering without removing accessible names. Screenshots accompany this checkpoint.

A native globe drag hid the far-side Austria/Italy markers (native covered class, opacity 0, visibility hidden) while near-side Norway/United States remained visible. Evidence images: `screenshots/map-hierarchy-globe-dark.png`, `screenshots/map-hierarchy-globe-light.png`, `screenshots/map-hierarchy-italy-light.png`.
