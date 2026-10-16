# Handoff: 15 Mount Rainier photos

Nicholas asked to add these 15 photographs to the `mount-rainier` location
(`src/data/locations.json`). They are his own work. A cloud session staged them
here because it had no Supabase credentials. **This folder is temporary.**
Delete it before merging.

The files are full-size JPEG exports with no Lightroom ID, capture time or
copyright, so they can't go through the Lightroom importer as they are.

## Preferred path (Lightroom)

If these photos are in the Lightroom catalog, tag them there (Country United
States, State Washington, City Mount Rainier, status `site` or `hero`), export,
and follow `docs/photo-pipeline.md`. Paste the alt text below into Lightroom
Alt Text first. Then delete this folder.

## Fallback (direct upload)

If they are not in Lightroom, encode and upload each file the way
`scripts/import-photographs.mjs` does: 1600px long-edge WebP at quality 88,
plus a 256px copy at `thumbs/<name>`. Then add manifest entries with
`locationId: "mount-rainier"`, `title: "Mount Rainier"`, an origin that says
where the file came from, and a `taken` time that Nicholas confirms. Do not
guess the date. Make sure a later Lightroom import does not drop these
entries, since entries without a `lightroomId` are kept.

## Alt text (draft)

| File | Alt text |
| --- | --- |
| 01.jpg | Close view of a glaciated mountain summit in alpenglow, rust-red rock ridges catching low sun between white ice fields under a clear blue sky |
| 02.jpg | A glaciated mountain glows pink at its summit above a slope of orange autumn grass, scattered firs and a large grey boulder |
| 03.jpg | Snow and rust-red rock of a glaciated mountain lit by low sun, rising behind a dense stand of dark firs on a golden hillside |
| 04.jpg | A pink and blue dusk sky over a grey rocky ridge, seen through a gap in dark firs above an orange autumn meadow |
| 05.jpg | A glaciated mountain catches warm pink light on its upper slopes above a dark, rock-strewn alpine meadow |
| 06.jpg | The glowing pink face of a snowy mountain framed between dark green firs, with a shadowed meadow below |
| 07.jpg | A jagged mountain range lit pink at sunset under an orange horizon, a distant snowy volcano at right, a dirt trail winding through dark meadow below |
| 08.jpg | Layered hazy ridges in orange sunset light, a rugged rocky peak at right and a dark fir forest in the foreground |
| 09.jpg | A woman with a blue backpack stands at a viewpoint in warm golden light, looking out over hazy mountains, orange shrubs and an amber lens flare at left |
| 10.jpg | Tall backlit firs glowing gold in low sun against a peach sky, hazy rocky peaks behind and a stony slope in front |
| 11.jpg | A jagged grey mountain range under a clear sky with a distant snowy volcano, a sunlit orange ridge of firs in the middle ground |
| 12.jpg | A white mountain goat grazes on a sunlit ridge beside a tall cluster of firs, hazy blue cliffs rising behind |
| 13.jpg | A rocky peak rises through layers of blue haze above dark firs and a rolling orange meadow, a small hiker at lower right |
| 14.jpg | A distant snow-capped volcano framed between dark fir branches, blue ridges layered in haze below it |
| 15.jpg | Layer after layer of forested ridges fading into blue haze, a dark treeline silhouetted in front and two thin contrails in the sky |

## Open questions for Nicholas

- What is the shoot date? (The light and autumn colour suggest late
  September, but confirm it.)
- Should any of these be heroes? Suggested: 12 (the goat) and 10 (the
  backlit firs).
