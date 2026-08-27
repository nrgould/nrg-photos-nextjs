# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev      # Start dev server with Turbopack (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint (Next.js + TypeScript rules)
npm start        # Start production server
```

## Architecture

Photography portfolio site built with Next.js 15 (App Router), React 19, and Tailwind CSS 4.

### Tech Stack
- **Animation**: Motion library (`motion/react-client`), Lenis (smooth scroll), CSS keyframes
- **3D**: Three.js + Globe.gl for interactive globe visualization
- **UI**: Shadcn/ui (new-york style), Radix primitives, Lucide icons
- **Styling**: Tailwind CSS 4 with OKLCH color variables, dark mode default

### Page Structure
Single-page portfolio at `src/app/page.tsx` with 8 sections rendered sequentially:
1. Hero - Mouse-tracking animated orbs
2. AboutSection - Bio
3. ScrollGallery - Horizontal scroll photo gallery
4. QuoteSection - Testimonial with green gradient
5. TestimonialsSection - Rotating carousel
6. TravelSection - Marquee-animated images
7. PolaroidStackSection - Stacked Polaroid cards
8. ContactPostcard - Contact form

### Key Files
- `src/app/layout.tsx` - Root layout with Plus Jakarta Sans font, SmoothScroll, Header
- `src/app/globals.css` - Theme variables, custom animations (marquee, button-fill, testimonial-rotate)
- `src/lib/utils.ts` - `cn()` utility (clsx + tailwind-merge)
- `src/components/ui/` - Shadcn components
- `next.config.ts` - Unsplash image remote pattern configured

### Import Aliases
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/ui` → `src/components/ui`

### Client Components
Components using interactivity need `'use client'` directive (Hero, Header, SmoothScroll, GreenGlobe).
