<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Photography project

- Next.js App Router with request-time SSR required by Nicholas. Keep `connection()` in the root layout.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. With a server running, `node scripts/verify-ssr.mjs` checks rendered routes.
- Read PRODUCT.md and DESIGN.md before changing content or visual direction.
- All gallery images must be Nicholas's original work, with source provenance in `src/lib/photo-manifest.json`. Files live in the public Supabase Storage bucket `photos`, keyed by the basename of `src`; `node --env-file=.env.local scripts/import-photographs.mjs` resizes and uploads them. `src` stays the photo id (favorites, filters, progress key on it); render through `photoUrl(src)`. Do not introduce stock or generated photographs as portfolio work.
- Edit collections and sequencing in `src/lib/photography.ts`.
- Contact mail goes only to the fixed address in `src/lib/site.ts`; visitor email is Reply-To. Preserve the explicit email-draft fallback without credentials. Tests must mock delivery.
