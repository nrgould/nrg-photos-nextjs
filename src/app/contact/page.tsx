import ContactForm from "@/components/ContactForm";
import PhotoImage from "@/components/PhotoImage";
import { heroPhotos } from "@/lib/photography";
import { site } from "@/lib/site";
export const metadata = {
  title: "Get in touch",
  description:
    "Inquire about brand photography, portraits or a new project with Nicholas Gould.",
  alternates: { canonical: "/contact" },
};
export default function ContactPage() {
  return (
    <main id="main" className="contact-page page-width">
      <div className="page-heading">
        <h1>Contact</h1>
        <p>Brand shoots, portraits and couples.</p>
      </div>
      <section className="contact-layout" aria-label="Contact Nicholas">
        <aside className="contact-postcard">
          <PhotoImage photo={heroPhotos[0]} priority />
          <div className="postcard-address">
            <p>
              To Nicholas,
              <br />
              North Carolina
            </p>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <a href={site.instagram} target="_blank" rel="noreferrer">
              @nicholasgould1
            </a>
          </div>
        </aside>
        <ContactForm
          emailEnabled={Boolean(
            process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL,
          )}
        />
      </section>
    </main>
  );
}
