import Link from "next/link";
import PhotoImage from "@/components/PhotoImage";
import { portrait, collections } from "@/lib/photography";
import { site } from "@/lib/site";
export const metadata = {
  title: "About",
  description:
    "Meet Nicholas Gould, a North Carolina photographer working with people, places and brands.",
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
          <h1>
            Always
            <br />
            <em>looking closer.</em>
          </h1>
          <p className="lead">
            I’m Nicholas. I’m a lifestyle photographer based in North Carolina,
            drawn to honest moments and the places that shape them.
          </p>
          <p>
            I photograph people, landscapes, and everyday experiences for brands
            and individuals. My approach is relaxed, with careful attention to
            the light, details, and small expressions that make a photograph
            feel personal.
          </p>
          <p>
            The same curiosity runs through my personal work. A window almost
            hidden by ivy. A village across the water. A familiar trail seen in
            a different light.
          </p>
          <Link href="/contact" className="text-link">
            Tell me what you have in mind
          </Link>
          <a
            href={site.instagram}
            className="subtle-link"
            target="_blank"
            rel="noreferrer"
          >
            More from my days, @nicholasgould1
          </a>
        </div>
      </section>
      <section className="approach page-width">
        <h2>
          How I <em>work.</em>
        </h2>
        <div>
          <article>
            <h3>Start with the story.</h3>
            <p>
              Understand the people, place, or purpose behind a project before
              deciding how it should look.
            </p>
          </article>
          <article>
            <h3>Leave room for the unexpected.</h3>
            <p>
              Make space for natural expressions and unplanned moments, with a
              thoughtful eye on the details.
            </p>
          </article>
          <article>
            <h3>Make something useful.</h3>
            <p>
              Balance creative vision with photographs that serve the people and
              brands they’re made for.
            </p>
          </article>
        </div>
      </section>
      <div className="about-landscape">
        <PhotoImage photo={collections[1].photos[7]} sizes="100vw" />
        <Link href="/work/far-from-here">A little further from home</Link>
      </div>
    </main>
  );
}
