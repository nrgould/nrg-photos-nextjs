---
name: Nicholas Gould Photography
description: A photographic journal of landscapes, people, and everyday moments.
colors:
  paper: "{green.100} #f5f3ec"
  ink: "{green.900} #243c30"
  muted: "{green.600} #60695f"
  line: "{green.200} #d6d9cd"
  forest: "{green.900} #243c30"
  pale: "{green.150} #e9eadf"
  white: "{green.50} #fffef9"
  clay: "#783e25"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(64px, 7vw, 96px)"
    fontWeight: 400
    lineHeight: 0.97
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(42px, 4.6vw, 68px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "11px"
rounded:
  square: "0"
  circular: "50%"
spacing:
  gutter: "clamp(22px, 4.3vw, 80px)"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "18px 24px"
  text-link:
    textColor: "{colors.ink}"
    padding: "13px 0"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "15px 0 13px"
  icon-button:
    textColor: "{colors.paper}"
    width: "48px"
    height: "48px"
  hero-control:
    textColor: "{colors.paper}"
    rounded: "{rounded.circular}"
    width: "44px"
    height: "44px"
---

# Design System: Nicholas Gould Photography

## Overview

**Creative North Star: "The Photographic Journal"**

Original photographs set the pace. Warm paper, forest ink, restrained captions, and large serif headings make room for locations and people to carry the identity. Staggered spreads alternate with quieter introductions and geographic exploration.

The system is built for a web experience: visitors browse photographs, open collections, and reach a direct inquiry. This document describes the implemented system in `src/app/globals.css` and the React components; the homepage strategy lives separately in `.impeccable/surfaces/`.

## Tokens and primitives

The system is Tailwind v4 plus shadcn (Base UI base, `components.json`). Read this section before writing UI.

- **One color source.** Every color is a token in the `:root` block of `src/app/globals.css`: the `--green-50`…`--green-950` ramp and `--clay`, then the names components use (`--paper`, `--forest`, `--line`…), then shadcn's semantic slots (`--primary`, `--muted-foreground`, `--border`, `--ring`, `--destructive`…), then `--map-*` for the globe and map. Tailwind's default palette is removed (`--color-*: initial`), so `bg-blue-500` does not exist; use `bg-primary`, `text-muted-foreground`, `border-input`, `bg-green-800`. `tests/palette.test.ts` fails on a raw color outside `:root` or a default-palette class in `src/`. Never weaken it; add a token.
- **Primitives live in `src/components/ui/`.** `Button` / `buttonVariants` (site variants `solid`, `link`, `quiet`, `icon`, `round`, `control`; shadcn variants `default`, `outline`, `secondary`, `ghost` with `size` `sm`/`lg`/`icon` for explorer dialogs and drawer actions; `press` adds the 0.96 press scale), `Input`, `Textarea`, `NativeSelect`, `Label`, `Dialog` (full-screen viewer; `variant="panel"` for contact and sign-in), `Sheet` (the retired portfolio header's top drop-down menu; the map's phone Menu is a drawer page), `ButtonGroup` (attached controls; the group sets the end-cap radius), `Empty` (centered empty states in drawer pages), `Item` (drawer list rows). Use `buttonVariants()` to style a `Link` or `<a>` as a button. Extend a variant before writing a one-off control; a new primitive needs a reason no variant covers it.
- **Cascade.** Site CSS sits in `@layer components`, so Tailwind utilities on a primitive win over it. New page-level layout can stay in that layer; component styling goes on the primitive.
- **Breakpoints** match the site's media queries: `xs` 381px, `sm` 701px, `md` 1051px, `xl` 1700px. `max-sm:` is the phone layout (≤700px).
- **Radius** is `0` on site pages (`--radius`); only `round` buttons and map markers are circular. The explorer scope sets `--radius: 0.625rem`, and `rounded-sm`/`md`/`lg`/`xl` scale from it.

**Key Characteristics:**

- Original photography at generous scale.
- Literary headings with small, clear sans-serif navigation and captions.
- Square image edges, fine rules, and pale regional backgrounds.
- Native scrolling with restrained image and link motion.

## Colors

Forest and warm paper echo the botanical and alpine photographs without competing with their colors. The frontmatter preserves the exact CSS custom-property values.

- **Forest:** filled inquiry actions and the closing footer.
- **Forest ink:** headings, body text, links, and icons.
- **Warm paper:** the page canvas and light controls.
- **Pale leaf:** the introduction field and image loading backgrounds.
- **Muted green-gray:** captions and secondary copy.
- **Soft divider:** one-pixel section and navigation rules.
- **Warm white:** text over the hero photograph.

Auxiliary states are tokens too: focus uses `--ring` (green-500); filled-button hover uses green-800; errors use `--destructive` (clay) on a clay tint mixed from it. The photo viewer uses green-950 so the image remains dominant.

## Typography

Cormorant Garamond carries the wordmark, headings, and occasional italic phrase; DM Sans carries navigation, copy, captions, and forms. Both load through `next/font` in the root layout. Headings use weight 400; retain the contrast between their scale and small metadata.

The frontmatter display role is the hero. General page h1 uses `clamp(54px, 6.8vw, 96px)`, line-height 1.02, and tracking −0.035em. Collection titles scale from 30px to 42px. Body defaults to 15px; prose sections commonly use 14px with widths around 340–530px. Captions range from 10–12px. Uppercase tracking is reserved for the wordmark's Photography subline.

## Layout

The content container is at most 1440px wide with fluid gutters. The header is 112px tall on desktop. The hero sits inside a 14px outer inset, fills most of the first viewport, and places its heading and action over the lower left of the photograph. A dark lower gradient supports legibility; captions and manual controls sit below a fine horizontal rule.

Collection spreads use 1.15fr/1fr columns, a 7.5% column gap, and intentionally offset image starts. Major desktop sections commonly use 85–110px vertical space. At 1050px, navigation and split layouts tighten. At 700px, primary layouts become a single column, offsets disappear, the header becomes 90px, and hero margins shrink to 8px. At 380px, additional compact controls and single-column work images avoid crowding.

Work overview galleries use three masonry columns on desktop, two at 1050px and most phone widths, and one below 380px. Collection detail galleries become one column at 700px. Keep photography at natural proportions in galleries; intentional cover crops belong to collection entrances and the hero.

The recovered portrait source is 300px square. Its final CSS treatment is a centered square, at most 280px on the homepage and 300px on About, including mobile. These final overrides take precedence over earlier portrait declarations.

## Elevation & Depth

Most surfaces are flat. Pale backgrounds, spacing, and rules separate regions. The mobile menu has a faint lower shadow. Avoid introducing elevated card shells around photographic collections.

Motion uses three curves, exposed as `ease-out`, `ease-in-out` and `ease-drawer` utilities and `var(--ease-*)`: `--ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` for enters, hovers and presses; `--ease-in-out` for things moving on screen; `--ease-drawer` for the retired header's drop-down menu. Transitions name their properties, never `all`. UI motion stays under 300ms and exits run faster than enters: the viewer fades and scales from 0.96 in 200ms and out in 150ms; the header menu drops from the top in 300ms and lifts in 200ms. Pressable controls scale to `--press` (0.96) on `:active`. Hover effects sit behind Tailwind's `hover:` variant, which only applies on devices that hover. Elsewhere: the hero settles once over 1.3s, collection images enlarge to 1.025 over 0.7s, and link arrows move 4px over 0.3s. The location globe starts still for selection, with optional rotation while visible; choosing a location turns toward its marker and pauses. Reduced-motion preference snaps to selected locations, suppresses automatic rotation, removes movement while keeping opacity fades, and restores automatic scroll behavior.

## Shapes

Photographs, buttons, and form controls have square corners. Circular outlines identify manual hero controls and geographic markers. Arrows are simple 20px inline SVG strokes, with horizontal and diagonal variants. Lucide icons in primitives use a 1.5 stroke to match. Fine borders and underlines supply definition without ornamental frames.

## Components

- **Primary button** (`Button`, `solid`): forest fill, paper text, 18px/24px padding, 54px minimum height, green-800 hover. Disabled buttons (only while sending) drop to 0.6 opacity with a wait cursor.
- **Text link** (`variant="link"`): a one-pixel rule under the label, generous vertical padding, an underline and a 4px arrow nudge on hover. Keep copy as the accessible link name. `quiet` is the smaller muted link.
- **Globe:** forest section, sage SVG land, subtle graticule, clickable labeled regional markers, four text location buttons, and a stack of original photographs from the selected location. Loose paper frames preserve natural photo proportions with modest rotation and soft offset shadows. Clicking the front card advances, clicking an exposed card brings it forward, and the collection link follows the front photo. Omit descriptive filler and image backplates. Pause when offscreen or the tab is hidden.
- **Arrows:** keep only directional photo/collection controls and the main footer contact invitation. Ordinary links rely on typography and underlines.
- **Navigation:** small sans-serif desktop links with an underline for hover/current route. Mobile uses `Sheet`: an explicit Menu/Close control, larger serif links, current-route semantics, focus trap, Escape, and close on navigation.
- **Collection entrance:** a large image above its title, category, and photo count. Hover or keyboard focus reveals a paper action strip. The strip is hidden on mobile; the whole entrance remains a link.
- **Photo viewer** (`src/components/Lightbox.tsx` on `Dialog`): full-screen dark viewer, contained image, caption, count, `icon` buttons for previous/next/close, arrow keys and swipe, and a filmstrip of every photo in the set below the caption: 44px rounded squares framed like the map thumbnails, the current one ringed at full opacity and kept centred. Any surface that opens photos reuses it.
- **Inquiry fields** (`Input`, `Textarea`, `NativeSelect` inside `Label`): transparent controls with a single lower border, visible labels, 48px minimum height, and 16px input text on mobile. Error and completed states must reflect actual delivery; the mail draft fallback is an explicit action.

All interactive elements use a 2px visible focus outline with 6px offset. Preserve the skip link and meaningful photo alternative text.

## Do's and Don'ts

- Do use Nicholas's original photographs and grounded collection names.
- Do preserve the hierarchy of image, title, and restrained caption.
- Do use the final square portrait sizing instead of enlarging the 300px source.
- Do retain manual controls, visible focus, and reduced-motion behavior.
- Don't invent testimonials, clients, print prices, or availability claims.
- Don't replace original photography with generated or stock imagery presented as Nicholas's.
- Don't add generic rounded card containers to collection spreads.

## Map and photographs prototype

`/explore` is a full-viewport neutral map. The shadcn/Vaul photo drawer starts closed; explicit location selection opens its compact25% snap, followed by75% and100%. The grab bar is the only resize control; on phones a tap on a photo in the compact strip expands the drawer to 75% instead of opening the viewer. Short viewports use a180px minimum compact preview. Photos scroll internally at larger snaps; the grab bar/header remain fixed. Above 700px the same drawer opens from the right as a full-height floating panel (400px, 12px inset); top and bottom controls shift left to clear it and every drawer mode (photos, presets, saved) uses it. A country (each US state stands in for the United States) lists its photographed places as two-column cards, cover plus name and photo count; a card opens that place, and on phones a pick made from the expanded drawer keeps it at 75% (map taps open at 25%). A place leads with up to three hero photographs (the first full width, the next two side by side), then the rest in capture order in a caption-free three-column grid; a full-width "View <country>" button returns to the country: on desktop it sits in a shadcn DrawerFooter pinned to the drawer foot, where later place actions join it; on phones it follows the last photo, reached only by scrolling to the end. Titles and dates live in the lightbox footer, not under each photo. Modes are switched from the top bar only; the drawer header holds a back button to the selected place and close, no mode tabs. Choosing a place from any nested page closes that page so its photos show. Cart, challenges, a single preset and the owned-preset library open as a nested drawer stacked over it: the base drawer recedes (scale 0.96, 16px back) and the nested panel takes its place on desktop, or rises as a shorter bottom sheet on phones. On desktop its back button closes the nested layer; on phones, where the photo drawer still shows above it, a close button does. The library button appears once the visitor owns a preset; Stripe's success redirect opens the library (`view=library`), which polls ownership until the paid presets confirm. Explorer `--primary` is neutral ink, not forest. Heart toggles in the photo header and lightbox save places and photographs to the Saved mode. On preview deployments and local dev only, the lightbox also has "Mark for removal"; a marked photo is dimmed in the drawer with a trash badge. Each new place toward the five-place goal and each found photo raise a toast below the top controls: a progress bar for places, a drawn check when complete. The first load spins the globe toward the selected place before settling; touching the map ends the spin. No recipe, pack or comparison controls in the active experience for this iteration.

The small bottom command bar composes shadcn Button/Tooltip/Separator. On phones it floats above the compact drawer and hides at larger snaps. On desktop the selected place's name sits above the bar in the display serif (28px, paper halo), so a step at globe scale is never lost. On phones Previous and Next preserve drawer state and Shuffle opens the new place's photos at 25%, like a marker tap; on desktop all three open the side drawer. All three reset photographs to the top. On desktop the command bar stays centered in the viewport while the side drawer is open; below 1040px it shifts left so the drawer cannot cover it. Desktop map thumbnails render at 4/3 scale (64px) with labels held at 11px; phones keep 48px. Bucket-list places (`src/data/bucket-list.json`) draw as 12px hollow rings, quieter than any thumbnail and 14px below their point so a country's own label stays clear; tapping one opens a shadcn Popover with the name and "Not yet visited". A place's thumbnail sits on its town center, with no anchor dot or leader line; it shifts 28px only to clear a neighbor. Places whose markers cannot be separated at the resting zoom draw as one stacked marker labeled "<largest place> +N"; clicking it zooms to fit its members, which then split into their own markers. Every zoom stop shifts closer by the amount that makes the globe span 60% of the viewport's short side, or 60% of its height on a phone, where the globe may run past the screen's width (`viewportZoomOffset`). The flat map is clamped so its top and bottom edges never enter the viewport; the globe stop has no edge to clamp. Search uses shadcn Command in the shared Dialog; zoom uses shadcn Slider with the exact six-dot reference appearance. Rounded Next.js Images replace the rejected stack treatment.

MapLibre6.12 owns native pan, pinch, inertia, camera, globe/Mercator projection and horizontal world wrapping. GeoJSON and workers are served locally without API keys or paid tiles. Gesture-end synchronization preserves the native camera; explicit slider requests animate with restrained easing. Motion14 supplies photo/icon feedback; the six-stop slider has discrete interaction values with restrained spring visual feedback; Vaul alone owns drawer gestures/transforms. Reduced motion uses zero camera duration. Rounded photo thumbnails remain keyboard operable. On phones the command bar ends with zoom and search: the zoom icon opens a shadcn Popover with the six-stop Slider, and search sits last (desktop keeps search top left); on desktop the same Slider is a standalone vertical rail on the left edge, up zooms in, with no stage labels or mode icon. Its lowest stop selects the globe. The map is the home page. Top right is one attached group: challenges, saved, cart (counts inline) and account; on phones account is icon-only. On desktop, theme and contact sit bottom left in a vertical group that rides the drawer with the command bar. On phones the top-left button is a 44px menu icon that opens a drawer page: All presets and Contact as `Item` rows on one pale card, then an Appearance heading over a Light/Dark segmented `ButtonGroup`. Menu pages drop the place back link, since each carries its own. Sign-in is a panel dialog: email, then the emailed code. Checkout never requires it: a signed-out buyer gets an anonymous Supabase session, and signing in later links the email to that session so purchases stay. With `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set, an Invisible-mode Turnstile token rides every session-creating Supabase call. The original D3 globe and Polaroid stacks are kept in code but not shown.

Otium's relevant Hanken/Fraunces product typography tokens remain applied through root font variables so portals inherit them. Dark green marks selected/core states only. Original portfolio routes, photos, SSR and contact behavior remain preserved. See `docs/location-presets-spec.md` and `docs/location-presets-verification.md`.
