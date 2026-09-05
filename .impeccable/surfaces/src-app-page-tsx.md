---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/work/page.tsx","src/app/work/[slug]/page.tsx","src/app/about/page.tsx","src/app/prints/page.tsx","src/app/contact/page.tsx"]
---

# Homepage photographic journal

Scope: homepage, with supporting Work, collection detail, About, Prints, and Contact routes. Platform: web. Visitor mode: Experience.

Audience and job: visitors exploring Nicholas's photographs, prospective collaborators, and print collectors. Start with the work; provide clear routes into a collection, a print inquiry, or a project conversation.

Chosen direction: photographic journal. The memorable first view is Hallstatt framed by trees, with a large lower-left heading, a direct photography link, a location caption, and manual image controls. The next passage uses four staggered collection entrances. A small square portrait introduces the photographer, followed by grounded client names, a print spread, and the final inquiry invitation.

Content and proof: use the original local photographs, real collection counts, established biography, and known client names. Collection and print pages extend the images already introduced. Do not invent journal entries or commercial claims.

Behavior: native scrolling; manual hero controls; route-based portfolio filtering; keyboard-operable full-screen image viewing; mobile menu; inquiry form with honest delivery and mail-draft fallback states. Initial content renders in server HTML.

Constraints: preserve the recovered portrait's native scale; keep all important actions usable without hover; retain visible focus and reduced-motion behavior. This was a code-led implementation with no generated comp. Review captures are in `.impeccable/review/`.

Unresolved: production email credentials and publication are operational decisions outside this visual brief. Audience prioritization remains the assumption recorded in PRODUCT.md.
