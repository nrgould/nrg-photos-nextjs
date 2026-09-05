import Link from "next/link";
import Hero from "@/components/Hero";
import CollectionCard from "@/components/CollectionCard";
import PhotoImage from "@/components/PhotoImage";
import { collections, heroPhotos, portrait } from "@/lib/photography";
import TravelGlobe from "@/components/TravelGlobe";
import { travelPlaces } from "@/lib/places";
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
            All photographs
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
            A little about me
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
      <TravelGlobe places={travelPlaces} />
      <section className="instagram-note page-width">
        <p>There’s more along the way.</p>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          Follow @nicholasgould1
        </a>
      </section>
    </main>
  );
}
