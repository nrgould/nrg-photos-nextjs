# Globe geography

`land.json` is the 1:110m land geometry from `world-atlas@2`, converted from TopoJSON to GeoJSON with `topojson-client`. Coordinates are rounded to four decimal places. Original source: Natural Earth, public domain.

- https://github.com/topojson/world-atlas
- https://www.naturalearthdata.com/about/terms-of-use/

The map is bundled locally. Location pins in `src/lib/places.ts` are regional reference points associated with Nicholas's photographs, not camera GPS metadata or a claimed travel route. Bucket-list pins (`bucket-list.json`) mark places he has not photographed; countries take their Natural Earth label point from `country-labels.json`, the rest carry a rounded area point.

## Map context

The interactive map uses locally generated land and international boundaries from `world-atlas@2.0.2/countries-50m.json` (Natural Earth 4.1.0, 1:50m). `scripts/lib/map-context.mjs` simplifies each shared TopoJSON arc once using a 0.04-degree Douglas–Peucker tolerance, preserving shared endpoints, then derives both land and internal boundaries from that same topology. Coordinates are rounded to four decimals. This keeps coastlines and country borders aligned; the original `land.json` remains unchanged for the portfolio globe.

At the map's maximum scale, 0.04 degrees of longitude is approximately 0.87 CSS pixels. This is **not** a universal pixel-error bound: Mercator latitude scaling increases toward the poles (approximately 1.3px at 47° latitude and 2.6px at 70° for a 0.04-degree latitude displacement). These are generalized world/regional shapes, not navigation or surveyed boundaries. Natural Earth's default boundary treatment is de facto control; the rendering does not introduce a new territorial policy.

The committed `country-labels.json` and `city-labels.json` are reduced, allowlisted derivatives of Natural Earth's versioned sources:

- [Admin 0 countries, 1:50m](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/): label names, rank, and supplied `LABEL_X`/`LABEL_Y` points. Source file: [v5.1.2 repository snapshot](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson), whose country dataset release is 5.1.1. Includes 242 country/territory labels.
- [Populated places, 1:110m](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-populated-places/): [v5.1.2 simple points](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_populated_places_simple.geojson), filtered to source `pop_max >= 500000`. Includes 170 cities; population is only a historical source ranking/filter, never displayed as a current population claim.
- Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/). [world-atlas provenance](https://github.com/topojson/world-atlas) documents the boundary source; its ISC license is copied to `/maps/world-atlas-LICENSE.txt`. The map retains “Natural Earth” attribution.

Refresh the committed labels by downloading those exact two GeoJSON files, then running `node scripts/import-map-labels.mjs <countries.geojson> <cities.geojson>`. Normal `npm run dev` / `npm run build` uses committed labels and installed dependencies only; no geography service, token, paid tile endpoint, or network import runs at build time.

## Close-zoom detail

From engine zoom 5, the map fades in OpenStreetMap water, woods, rivers, major roads and city names (towns from zoom 7, villages from 10; they replace the Natural Earth city labels there, and names that match a photo place are left to its marker) from [OpenFreeMap](https://openfreemap.org) vector tiles (`https://tiles.openfreemap.org/planet`, free, no key). The browser fetches them at runtime only for the zoom and area on screen; nothing loads below zoom 5, and the build stays offline. The map credits OpenFreeMap, OpenMapTiles and OpenStreetMap (ODbL) beside Natural Earth.

Generated assets and their local gzip sizes:

| URL                         | Shape                                                    | Raw bytes | Gzip bytes |
| --------------------------- | -------------------------------------------------------- | --------: | ---------: |
| `/maps/land.json`           | Polygon land collection, dateline/pole-safe              |   486,109 |    178,195 |
| `/maps/boundaries.json`     | Feature / MultiLineString, internal country borders only |   100,934 |     40,519 |
| `/maps/country-labels.json` | 242 Point features                                       |    35,884 |      5,806 |
| `/maps/city-labels.json`    | 170 Point features                                       |    28,593 |      4,043 |
| Total                       | Excludes existing graticule/engine/fonts                 |   651,520 |    228,563 |

Label properties are `{id, name, rank, minZoom}`; cities additionally carry `capital`. Country `minZoom` values span 1.4–3.7 by label rank; the integrated filter caps them at engine zoom 3 so small-country labels remain reachable below the maximum supported zoom. City `minZoom` values retain the generated population-tier metadata, but the integrated UI deliberately does **not** filter cities per feature: MapLibre evaluates zoom-dependent filters at integer zoom levels, making higher fractional thresholds unreachable below the current maximum engine zoom of about 3.94. Instead, one sparse 170-point city layer starts at layer `minzoom: 3.2`, with native collision avoidance and rank-based placement priority. Lower `rank` has higher priority; labels never force overlap. Do not turn these context labels into photograph locations or travel/reward evidence.

MapLibre GL JS 6.12 supports [local fonts when the style omits `glyphs`](https://maplibre.org/maplibre-style-spec/glyphs/). Resolve the existing Hanken family from `--font-explorer-sans`, wait for `document.fonts.load(...)`, and use it in `text-font` with a sans-serif fallback. No glyph service is needed. `localIdeographFontFamily` only overrides CJK glyphs; there is no `localFontFamily` map option in the installed version. Native symbol layers provide collision management; DOM photo markers remain a separate overlay.

`tests/map-context.test.ts` verifies source deviation along the shared Austria–Italy border, country membership at Bolzano/Lago di Braies versus Innsbruck/Hallstatt, dateline splitting in both directions, generated ring closure, unique/valid label points, deterministic generation, unchanged source data, and a combined gzip budget under 250KB.
