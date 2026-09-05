import Link from "next/link";
import Hero from "@/components/Hero";
import CollectionCard from "@/components/CollectionCard";
import PhotoImage from "@/components/PhotoImage";
import { Arrow } from "@/components/Arrow";
import {
  collections,
  heroPhotos,
  portrait,
  printPhotos,
} from "@/lib/photography";
import { site } from "@/lib/site";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <main id="main">
      <Hero photos={heroPhotos} />
      <div className="intro-line">
        <p>Landscape. Lifestyle. The moments in between.</p>
        <span>Based in North Carolina</span>
      </div>
      <section className="selected-work page-width">
        <div className="section-heading">
          <h2>
            A few ways of <em>seeing.</em>
          </h2>
          <Link href="/work" className="text-link">
            All photographs <Arrow />
          </Link>
        </div>
        <div className="collection-grid">
          {collections.map((collection) => (
            <CollectionCard key={collection.slug} collection={collection} />
          ))}
        </div>
      </section>
      <section className="about-preview">
        <div className="about-preview-image">
          <PhotoImage photo={portrait} />
        </div>
        <div className="about-preview-copy">
          <h2>
            Curiosity first.
            <br />
            <em>Camera second.</em>
          </h2>
          <p>
            I’m Nicholas, a photographer based in North Carolina. I make
            photographs of people, places, and the small things that give them
            their character.
          </p>
          <p>
            My work brings a relaxed approach and a careful eye to portraits,
            everyday experiences, and stories for brands.
          </p>
          <Link href="/about" className="text-link">
            A little about me <Arrow />
          </Link>
        </div>
      </section>
      <section className="client-line page-width">
        <p>A few brands I’ve worked with</p>
        <div>
          <span>Smartwool</span>
          <span>Raven’s Brew Coffee</span>
          <span>Eight Angles</span>
          <span>C2Life</span>
        </div>
      </section>
      <section className="print-preview page-width">
        <div className="print-preview-copy">
          <h2>
            A place to
            <br />
            <em>come back to.</em>
          </h2>
          <p>
            Bring a little of the outside in. Selected photographs, printed on
            Hahnemühle Photo Rag and signed by hand.
          </p>
          <Link href="/prints" className="text-link">
            Explore fine art prints <Arrow />
          </Link>
        </div>
        <Link
          href="/prints"
          className="print-mat"
          aria-label="Explore Lago di Braies and the fine art print collection"
        >
          <PhotoImage photo={printPhotos[0]} />
          <span>Lago di Braies, Italy</span>
        </Link>
      </section>
      <section className="instagram-note page-width">
        <p>There’s more along the way.</p>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          Follow @nicholasgould1 <Arrow diagonal />
        </a>
      </section>
    </main>
  );
}
