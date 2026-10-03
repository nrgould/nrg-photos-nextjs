import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import Hero from "@/components/Hero";
import CollectionCard from "@/components/CollectionCard";
import PhotoImage from "@/components/PhotoImage";
import {
  allPhotos,
  collections,
  heroPhotos,
  portrait,
} from "@/lib/photography";
import TravelGlobe from "@/components/TravelGlobe";
import { travelPlaces } from "@/lib/places";
import { site } from "@/lib/site";
export const metadata = { alternates: { canonical: "/" } };
export default function Home() {
  return (
    <main id="main">
      <Hero photos={heroPhotos} />
      <div className="intro-line">
        <p>Landscape, travel, portraits and brand work.</p>
        <span>North Carolina</span>
      </div>
      <section className="selected-work page-width">
        <div className="section-heading">
          <h2>Work</h2>
          <Link
            href="/work"
            className={buttonVariants({
              variant: "link",
              className: "mb-1.5 max-sm:mt-3.5",
            })}
          >
            All {allPhotos.length} photographs
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
          <h2>About</h2>
          <p>
            I’m Nicholas Gould, a photographer in North Carolina. I shoot brand
            and lifestyle work, portraits, and landscapes from wherever I’m
            traveling.
          </p>
          <Link
            href="/about"
            className={buttonVariants({ variant: "link", className: "mt-2" })}
          >
            More about me
          </Link>
        </div>
      </section>
      <section className="client-line page-width">
        <p>Clients</p>
        <div>
          <span>Smartwool</span>
          <span>Raven’s Brew Coffee</span>
          <span>Eight Angles</span>
          <span>C2Life</span>
        </div>
      </section>
      <TravelGlobe places={travelPlaces} />
      <section className="instagram-note page-width">
        <p>Instagram</p>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          @nicholasgould1
        </a>
      </section>
    </main>
  );
}
