---
name: Nicholas Gould Photography
description: A photographic journal of landscapes, people, and everyday moments.
colors:
  paper: "#f5f3ec"
  ink: "#263d32"
  muted: "#60695f"
  line: "#d6d9cd"
  forest: "#243c30"
  pale: "#e9eadf"
  white: "#fffef9"
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
  hero-control:
    textColor: "{colors.paper}"
    rounded: "{rounded.circular}"
    width: "44px"
    height: "44px"
---

# Design System: Nicholas Gould Photography

## Overview

**Creative North Star: "The Photographic Journal"**

Original photographs set the pace. Warm paper, forest ink, restrained captions, and large serif headings make room for locations and people to carry the identity. Staggered spreads alternate with quieter introductions and print presentations.

The system is built for a web experience: visitors browse photographs, open collections, and reach a direct inquiry. This document describes the implemented system in `src/app/globals.css` and the React components; the homepage strategy lives separately in `.impeccable/surfaces/`.

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

Auxiliary states remain in CSS: focus uses `#768d55`; button hover uses `#395341`; error feedback uses `#f3e1d8` with `#783e25` text. The photo viewer uses `#18241e` so the image remains dominant.

## Typography

Cormorant Garamond carries the wordmark, headings, and occasional italic phrase; DM Sans carries navigation, copy, captions, and forms. Both load through `next/font` in the root layout. Headings use weight 400; retain the contrast between their scale and small metadata.

The frontmatter display role is the hero. General page h1 uses `clamp(54px, 6.8vw, 96px)`, line-height 1.02, and tracking −0.035em. Collection titles scale from 30px to 42px. Body defaults to 15px; prose sections commonly use 14px with widths around 340–530px. Captions range from 10–12px. Uppercase tracking is reserved for the wordmark's Photography subline.

## Layout

The content container is at most 1440px wide with fluid gutters. The header is 112px tall on desktop. The hero sits inside a 14px outer inset, fills most of the first viewport, and places its heading and action over the lower left of the photograph. A dark lower gradient supports legibility; captions and manual controls sit below a fine horizontal rule.

Collection spreads use 1.15fr/1fr columns, a 7.5% column gap, and intentionally offset image starts. Major desktop sections commonly use 85–110px vertical space. At 1050px, navigation and split layouts tighten. At 700px, primary layouts become a single column, offsets disappear, the header becomes 90px, and hero margins shrink to 8px. At 380px, additional compact controls and single-column work images avoid crowding.

Work overview galleries use three masonry columns on desktop, two at 1050px and most phone widths, and one below 380px. Collection detail galleries become one column at 700px. Keep photography at natural proportions in galleries; intentional cover crops belong to collection entrances and the hero.

The recovered portrait source is 300px square. Its final CSS treatment is a centered square, at most 280px on the homepage and 300px on About, including mobile. These final overrides take precedence over earlier portrait declarations.

## Elevation & Depth

Most surfaces are flat. Pale backgrounds, spacing, and rules separate regions. Print mats alone suggest physical paper through `0 18px 30px -25px #60705735`; the homepage print image has `0 4px 12px #45553815`. The mobile menu has a faint lower shadow. Avoid introducing elevated card shells around photographic collections.

Motion uses `cubic-bezier(0.22, 1, 0.36, 1)`: the hero settles once over 1.3s, collection images enlarge to 1.025 over 0.7s, and link arrows move 4px over 0.3s. Reduced-motion preference removes animation and transitions and restores automatic scroll behavior.

## Shapes

Photographs, print mats, buttons, and form controls have square corners. Circular outlines identify manual hero controls only. Arrows are simple 20px inline SVG strokes, with horizontal and diagonal variants. Fine borders and underlines supply definition without ornamental frames.

## Components

- **Primary button:** forest fill, paper text, 18px/24px padding, 54px minimum height, and a lighter forest hover. Disabled buttons show wait cursor and 0.65 opacity.
- **Text link:** a one-pixel underline, generous vertical padding, and an arrow that shifts on hover. Keep copy as the accessible link name.
- **Navigation:** small sans-serif desktop links with an underline for hover/current route. Mobile uses an explicit Menu/Close disclosure with larger serif links, current-route semantics, and Escape support.
- **Collection entrance:** a large image above its title, category, and photo count. Hover or keyboard focus reveals a paper action strip. The strip is hidden on mobile; the whole entrance remains a link.
- **Photo viewer:** full-screen dark native dialog, contained image, caption, count, and previous/next/close controls. Preserve keyboard operation and focus handling.
- **Inquiry fields:** transparent controls with a single lower border, visible labels, 48px minimum height, and 16px input text on mobile. Error and completed states must reflect actual delivery; the mail draft fallback is an explicit action.

All interactive elements use a 2px visible focus outline with 6px offset. Preserve the skip link and meaningful photo alternative text.

## Do's and Don'ts

- Do use Nicholas's original photographs and grounded collection names.
- Do preserve the hierarchy of image, title, and restrained caption.
- Do use the final square portrait sizing instead of enlarging the 300px source.
- Do retain manual controls, visible focus, and reduced-motion behavior.
- Don't invent testimonials, clients, print prices, or availability claims.
- Don't replace original photography with generated or stock imagery presented as Nicholas's.
- Don't add generic rounded card containers to collection spreads.
