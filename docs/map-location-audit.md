# Map location audit

Reviewed 2026-10-04. Each pin opens a regional collection. It is a representative geographic reference, **not the camera position of every photograph**. `location` describes the collection's coverage; required `referenceLabel` names the pin's reference area. Coordinates use `[longitude, latitude]` and are rounded to two decimal places rather than implying photographic GPS precision.

## References checked

| Collection | Collection coverage | Pin `[longitude, latitude]` | Primary geographic evidence |
| --- | --- | --- | --- |
| Austria | Hallstatt | `[13.65, 47.56]` | [Destination Dachstein's Hallstatt entry](https://dachstein.salzkammergut.at/oesterreich-stadt-ort/detail/430000973/hallstatt.html) explicitly publishes latitude `47.56`, longitude `13.65` under “Daten & Fakten.” Existing reference retained. |
| Italy | Dolomites | `[12.08, 46.70]` | [Hotel Pragser Wildsee's official arrival page](https://www.lagodibraies.com/en/hotel-pragser-wildsee/arrival-p135.html) identifies its lakeside location; its HTML `geo.position` and Open Graph coordinates publish latitude `46.6988751`, longitude `12.0825182`. Rounded to a Lago di Braies area reference. This is a lake-area anchor for the wider collection, not a claim that the photographs were taken at the hotel. |
| Norway | Northern Norway · Lofoten | `[13.38, 68.05]` | [Kartverket's official place-name API](https://ws.geonorge.no/stedsnavn/v1/navn?sok=Lofoten&fuzzy=false&utkoordsys=4258) returns Lofoten, `stedsnummer: 26064`, type `Landskapsområde`, Nordland, with representative point latitude `68.04534`, longitude `13.38235` in EPSG:4258. Rounded for this map. [Destination Lofoten](https://visitlofoten.com/en/) independently places the islands in Northern Norway around the 68th parallel. Replaces the unsupported Tromsø reference `[18.96, 69.65]`. |
| North Carolina | Lake James · Raleigh | `[-81.89, 35.75]` | [NC State Parks](https://www.ncparks.gov/state-parks/lake-james-state-park) publishes Paddy's Creek Access at latitude `35.7503`, longitude `-81.8920`. The existing rounded Lake James area reference is retained. It does not locate the university photograph. |

The Norway API was read directly because the web page reader could not fetch its JSON. The lake operator's coordinates were read from its public HTML metadata. EPSG:4258 versus WGS84 differences are immaterial at the two-decimal regional precision used here.

## What the photo provenance supports

Evidence comes from `src/lib/photography.ts` and the original asset names/URLs in `src/lib/photo-manifest.json`. No recorded camera GPS is available in this mapping data. Geographic reference sources verify places, not where Nicholas stood.

- **Austria:** “Scenes from Hallstatt” and “Still water, Hallstatt” identify Hallstatt. Their exact shooting positions are unknown.
- **Italy:** Original names identify Lago di Braies, Seceda, Santa Magdalena and Cadini di Misurina. The collection label is therefore “Dolomites,” not “Lago di Braies.” No attempt is made to assign those other photographs to the lake pin.
- **Norway:** The original filenames for “Out in the elements” and “Emily, Lofoten” explicitly identify the Lofoten Islands, Norway. “Into the Arctic” has the source filename `landscape_sailboat_in_a_blizzard`; it does not establish a town, island or camera coordinate. Its existing Norway collection membership is retained as a curation assumption, **not independently verified location evidence**. In particular, neither Tromsø nor Lofoten is asserted as that photograph's exact location.
- **North Carolina:** “Lake James” identifies the lake; “A new chapter” has the source filename `portrait_ncsu_grad_photo_4` and existing NC State University caption. [NC State's official campus guide](https://visit.ncsu.edu/) confirms its Raleigh setting. The latter belongs to the Raleigh portion of the collection, not Lake James. Its precise campus shooting position is unknown.

Remaining evidence gap: photographer confirmation or original capture metadata is needed before publishing exact photo pins, and to verify the Norway assignment of “Into the Arctic.” No photo coordinates were invented or inferred from visual resemblance.
