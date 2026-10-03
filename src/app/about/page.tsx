import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import PhotoImage from "@/components/PhotoImage";
import { portrait, collections } from "@/lib/photography";
import { site } from "@/lib/site";
export const metadata = {
  title: "About",
  description:
    "Nicholas Gould is a North Carolina photographer shooting brand, portrait and travel work.",
  alternates: { canonical: "/about" },
};
export default function AboutPage() {
  return (
    <main id="main">
      <section className="about-page page-width">
        <div className="about-page-photo">
          <PhotoImage photo={portrait} priority />
          <span>Nicholas Gould, photographer</span>
        </div>
        <div className="about-page-copy">
          <h1>About</h1>
          <p className="lead">
            I’m Nicholas Gould, a photographer based in North Carolina.
          </p>
          <p>
            I shoot brand and lifestyle work, portraits and couples. Clients
            include Smartwool, Raven’s Brew Coffee, Eight Angles and C2Life.
          </p>
          <p>
            My personal work is mostly travel and landscape, from the Alps and
            Dolomites to northern Norway and the mountains of western North
            Carolina.
          </p>
          <Link
            href="/contact"
            className={buttonVariants({ variant: "link", className: "mt-2" })}
          >
            Contact
          </Link>
          <a
            href={site.instagram}
            className={buttonVariants({
              variant: "quiet",
              className: "mt-8 flex w-max",
            })}
            target="_blank"
            rel="noreferrer"
          >
            Instagram @nicholasgould1
          </a>
        </div>
      </section>
      <section className="approach page-width">
        <h2>Services</h2>
        <div>
          <article>
            <h3>Brand & lifestyle</h3>
            <p>Product and lifestyle photography on location.</p>
          </article>
          <article>
            <h3>Portraits</h3>
            <p>Individuals and couples.</p>
          </article>
          <article>
            <h3>Travel & landscape</h3>
            <p>Personal work from Europe and North Carolina.</p>
          </article>
        </div>
      </section>
      <div className="about-landscape">
        <PhotoImage photo={collections[1].photos[7]} sizes="100vw" />
        <Link href="/work/far-from-here">Far from here</Link>
      </div>
    </main>
  );
}
