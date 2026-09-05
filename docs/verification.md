# Verification

Verified September 4, 2026 against the production build served locally on port 3107.

## Automated checks

- `npm run build`: passes with Next.js 16.3.4. All site pages and the contact API are dynamic; icon, robots and sitemap are static.
- `npm run typecheck`: passes.
- `npm run lint`: passes.
- `npm test`: 8 passing tests covering email routing/validation/failure behavior original-photo integrity, globe projection, date-line turns and location/photo mapping. No real email sent.
- `node scripts/verify-ssr.mjs`: 9 page/filter cases pass, with headings, metadata and photo counts present in HTML after script tags are removed. Unknown collection returns HTTP 404 with noindex. Robots and sitemap return 200. Prints is absent from navigation and sitemap, and its removed route returns 404. Globe geometry and location controls appear in server HTML.
- Dependency audit after upgrades: 0 known vulnerabilities.
- Initial design detector: no findings. The globe refinement scan produced token advisories against the existing design sidecar; its sage/forest geography palette is intentional. Photo provenance scan: 40 rasters, 0 missing origins.

## Browser checks

- Desktop 1440×1000 and phone 390×844: no horizontal overflow; all home images load.
- 320px phone: home and contact fit the viewport.
- 768px tablet: travel collection fits, with 12 photograph controls.
- Hero next button changes the photograph and caption.
- Work filter changes the URL, selected category and image count to seven nature photographs.
- Image viewer opens, locks background scroll, advances with ArrowRight, closes with Escape, restores scroll and returns focus to its triggering photograph.
- Mobile menu opens, routes to Contact, and closes after selection.
- Globe location selection centers the matching marker, updates the original photograph, and links to its anchored figure in the travel collection.
- Globe rotation pauses/resumes on request and stops while offscreen. Reduced motion suppresses rotation and immediately centers the selected location. Desktop 1440px and mobile 390px reviewed; no horizontal overflow at 320px.
- The globe's SVG coordinates are rounded consistently across server and browser to avoid hydration differences. A fresh load has no hydration warning.
- Draft preparation shows an explicit unsent state and a mailto link. Returning to the form preserves visitor name, address, interest and message.
- No browser runtime errors observed during these flows.

## Visual review

Initial redesign independent review disposition: ship within the bounded correction review. The three original findings were resolved: mobile hero requests sufficient resolution for the cover crop; the 300×300 original portrait is presented as a native-scale square; a redundant footer label was removed.

Screenshots are local review artifacts in `.impeccable/review/` and are not committed. The main preview is the production server at http://localhost:3107.

## Operational status

No production deployment, domain/DNS changes, or real email delivery performed. Resend credentials and a verified sender are required to enable direct delivery. The existing site's portrait is limited to 300×300; its source limitation is preserved honestly rather than interpolated into a fabricated replacement.
