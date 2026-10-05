# Project settings, October4,2026

| Package | Installed | Latest stable verified from npm |
| --- | --- | --- |
| Next.js |16.3.8|16.3.8|
| React / React DOM |19.2.8|19.3.0|
| TypeScript |5.9.2|7.0.2|
| Tailwind CSS |4.3.3|4.3.3|
| shadcn CLI |4.21.1|4.21.1|
| Motion |14.0.0|14.0.0|
| MapLibre GL |6.12.0|6.12.0|
| Vaul |1.1.2|1.1.2|

Authoritative versions were read from each package's [npm registry latest endpoint](https://registry.npmjs.org/next/latest) (replace `next` with the package name), not canary tags. shadcn components are copied local source, so the CLI version is not a component runtime version. This project uses base-nova, Base UI primitives, Lucide, CSS variables, plus the existing Radix/Vaul drawer integration.

Node24 is now the project/CI/Vercel release line. Native local verification uses24.20.0 ARM64/npm11.19.0, already installed on this Mac. [Node's official release page](https://nodejs.org/en/about/previous-releases) lists24.21.0 as latestLTS and26.10.0 as current; the local patch is therefore one release behind. The previous default shell used EOL23.5.0 under Rosetta. No global runtime or shell profiles were changed. npm's latest12.2.0 requires a supported recent Node22/24/26; use the bundled npm rather than upgrading the package manager during this UI change.

Next App Router, request-time SSR via root `await connection()`, default Node server runtime and Turbopack. No experimental Next flags, custom bundler or middleware. Local images use next/image AVIF/WebP, allowed qualities75/85. `poweredByHeader` and dev indicators are disabled. Fonts are self-hosted by next/font; build-time access to Google font files is needed. Fraunces no longer preloads on the map.

Vercel's `nrg-photos-nextjs` project was inspected: root `.`, Next.js framework preset, Node24.x, default Next build/output/install detection. `npm run build` invokes prebuild to generate local map workers/geography; deployments must preserve this lifecycle. GitHub CI uses npm ci, lint, typecheck, tests, build and SSR checks. The canonical existing portfolio remains on Netlify; this PR's Vercel URLs are previews.

Recommended separate upgrade sequence: update native Node24 patch, update React and React DOM together to19.3 after drawer/dialog/hydration regressions, then evaluate TypeScript7 in an isolated compiler migration. TypeScript7 is a major jump from5.9; verify Next's build integration, tsx, ESLint tooling and all existing type checks before changing it. No silent framework/compiler upgrade was made during the map repair. Stripe is not installed/configured yet; see the commerce section of the spec for the approved next phase.
