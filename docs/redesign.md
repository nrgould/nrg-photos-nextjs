# Photography redesign

Build a photographic journal from Nicholas's own work. The visual reference is the public Instagram grid, particularly A Study in Green, Lago di Braies, Scenes from Hallstatt and Moments from Bavaria. Use warm paper, forest ink, a literary serif, small sans-serif captions and generous image areas.

Grounded directions considered: gallery exhibition, travel monograph, photographic journal, botanical folio, location archive, print contact sheet, editorial magazine. The photographic journal carries both travel and client work without reducing either to a sales page. Abstract data and instrument-display directions obscure the photographs; keep their clear indexing and explicit control states, not their visual motifs.

The homepage opens with an original Hallstatt photograph, then four collections, a short personal introduction, an interactive location globe and an inquiry link. Supporting routes: /work with server-side filters, /work/[slug] with full photo viewers, /about, /contact. No fabricated journal entries, clients, quotes or prices.

Use request-time Next.js rendering via connection() in the site layout. Images are local optimized WebP files; client code is limited to navigation, hero selection, the viewer and the inquiry form. All initial content remains in server HTML. Native scroll and reduced-motion support replace the previous scroll effects.

Contact sends only to Nicholas through Resend when configured. Without credentials, visitors can prepare and open a mailto draft; the interface never reports an unsent inquiry as sent. The old endpoint sent to the visitor and interpolated raw HTML, which the redesign replaces with fixed-recipient plain-text email.

Validate a production build, lint, types, contact schema and delivery through an injected mock, server-rendered HTML without JavaScript, portfolio filtering, lightbox keyboard behavior, mobile layout, image loading and inquiry fallback. Publishing and DNS remain a separate decision after the local preview is reviewed.

The location globe links Austria, Italy, Norway and North Carolina to existing photographs. Selecting a location centers its regional marker, pauses rotation and updates a stack of photographs; its link opens the front image in its original collection. Geography is local SVG rendered by d3-geo, including the initial server HTML. Animation pauses offscreen and in hidden tabs. Reduced motion uses immediate selection without rotation.

Print promotion, navigation, route and inquiry choices were removed at Nicholas's request. Arrows remain only on directional photo/collection controls and the main footer contact invitation.

The globe markers are directly clickable, with text labels separating nearby locations. Rotation starts paused so targets remain easy to select. The right side presents two Austrian, four Italian, three Norwegian and two North Carolina originals as loose polaroids. The stack uses natural image dimensions without dark letterboxing. Front-card clicks advance; exposed cards can be brought forward; keyboard focus follows the active card. Location arrays can accept additional originals. Removed the descriptive filler requested by Nicholas.
