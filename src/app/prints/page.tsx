import Link from "next/link";
import PhotoImage from "@/components/PhotoImage";
import { printPhotos } from "@/lib/photography";
import { Arrow } from "@/components/Arrow";
export const metadata = {
  title: "Fine art prints",
  description:
    "Selected photographs by Nicholas Gould, signed and printed on Hahnemühle Photo Rag. Inquire about sizes and availability.",
  alternates: { canonical: "/prints" },
};
export default function PrintsPage() {
  return (
    <main id="main" className="prints-page page-width">
      <div className="page-heading">
        <h1>
          A view to <em>keep.</em>
        </h1>
        <p>For the places you return to, even when you’re standing still.</p>
      </div>
      <div className="print-intro">
        <p>
          Selected photographs, printed on Hahnemühle Photo Rag and signed by
          hand. A quieter kind of souvenir.
        </p>
        <p>
          Each piece begins with a conversation. Get in touch for available
          sizes, editions, and pricing.
        </p>
      </div>
      <div className="prints-grid">
        {printPhotos.map((photo, i) => (
          <article key={photo.src}>
            <Link
              className="print-mat"
              href={`/contact?interest=print&photograph=${encodeURIComponent(photo.title)}`}
              aria-label={`Inquire about a print of ${photo.title}`}
            >
              <PhotoImage photo={photo} priority={i === 0} />
              <span>Nicholas Gould</span>
            </Link>
            <div className="print-caption">
              <h2>{photo.title}</h2>
              <Link
                className="text-link"
                href={`/contact?interest=print&photograph=${encodeURIComponent(photo.title)}`}
              >
                Inquire about this print <Arrow diagonal />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="print-note">
        <h2>
          Have another photograph <em>in mind?</em>
        </h2>
        <p>
          If something in the portfolio has stayed with you, ask about having it
          printed.
        </p>
        <Link href="/contact?interest=print" className="text-link">
          Ask about a photograph <Arrow />
        </Link>
      </div>
    </main>
  );
}
