# Nicholas Gould photography

A redesign of nicholasgouldphoto.com built with Next.js 16, React 19 and TypeScript. Warm paper, forest green, original photographs, and typography informed by Nicholas's Instagram. The portfolio contains 39 curated photographs in four collections.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. The Codex review session uses port 3107.

```sh
npm run dev -- --port 3107
```

## Rendering

`src/app/layout.tsx` calls `await connection()` so all portfolio pages render on each request. Collection filters are URL-driven and rendered on the server. The initial HTML contains the photographs, captions, navigation and page copy. Small client components provide the featured-photo controls, mobile menu, location globe, native-dialog viewer and inquiry form. There is no Instagram feed or external photo API needed at runtime.

`next/font` downloads and self-hosts Cormorant Garamond and DM Sans during the build. Deployment builds need internet access for that download. Photographs are local WebP files delivered through `next/image`.

## Content

- `src/lib/photography.ts`: collections, sequence, titles and alt text.
- `src/lib/places.ts`: globe locations and their original-photo sets; add photos to each `photos` array to extend the stack.
- `src/data/land.json`: local Natural Earth geography (see `src/data/README.md`).
- `src/lib/photo-manifest.json`: original-image sources and dimensions.
- `src/lib/site.ts`: canonical domain, contact address and Instagram profile.
- `public/photos`: curated optimized originals.
- `public/images`: original assets retained from the earlier experiment.
- `docs/redesign.md`: design decisions and verification scope.

Photos were recovered from the existing website and the repository at `ade778d`. The Instagram profile was visually reviewed, including its green studies and alpine/travel collections. No stock imagery, AI-generated photographs or invented testimonials are presented as Nicholas's work.

The existing site's Nicholas portrait is only 300×300. It is displayed as a small square to preserve its quality; replace it with the original when available. The portrait's filename and dimension entry must both be updated when replacing it.

To rebuild local WebP derivatives from the recorded sources:

```sh
node scripts/import-photographs.mjs
```

This command requires network access to nicholasgouldphoto.com for images imported from that site. The shipped images remain independent of the old website.

## Contact delivery

Copy `.env.example` to `.env.local` and provide:

- `RESEND_API_KEY`: the Resend API key.
- `CONTACT_FROM_EMAIL`: a sender on a domain verified in that Resend account.

With both configured, the form sends a plain-text inquiry **to nicholas@nicholasgouldphoto.com**, using the visitor's address as Reply-To. Without both values, the form prepares an email draft for the visitor to send using their own email app. No automatic email is sent in draft mode.

The handler validates input, caps request size, checks Origin, and ignores honeypot submissions. For a public launch with direct email delivery, configure host-level rate limiting or bot protection appropriate to traffic; there is no shared rate-limiter service in this repository. Contact tests inject a mock sender and send no real email.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Tests cover fixed-recipient delivery, Reply-To, literal content, validation, request limits, cross-origin rejection, honeypot behavior, delivery failures, draft encoding and original-photo integrity.

Browser checks performed: desktop 1440px, mobile 390px; hero controls, navigation, filters, image viewer arrow/Escape controls and focus return, direct globe-marker selection, photograph stacks, keyboard cycling and reduced motion, draft flow and preserving entered data. Additional narrow and medium viewport checks are documented in `docs/verification.md`.

## Deploy

Use a Node.js host supporting Next.js SSR, or import this repository into Vercel with the Next.js preset. Build command: `npm run build`. For a self-hosted Node.js server, run `npm start` behind your TLS proxy.

The canonical URLs are set to https://nicholasgouldphoto.com. Review copy and photo selection, configure email if desired, then deploy and point the domain at the new host. This work has not changed production hosting, DNS or the live website.
