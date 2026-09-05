import ContactForm from "@/components/ContactForm";
import PhotoImage from "@/components/PhotoImage";
import { heroPhotos } from "@/lib/photography";
import { site } from "@/lib/site";
import { Arrow } from "@/components/Arrow";
export const metadata = {
  title: "Get in touch",
  description:
    "Inquire about brand photography, portraits or a fine art print with Nicholas Gould.",
  alternates: { canonical: "/contact" },
};
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ interest?: string; photograph?: string }>;
}) {
  const params = await searchParams;
  const printTitle =
    typeof params.photograph === "string"
      ? params.photograph.slice(0, 150)
      : undefined;
  return (
    <main id="main" className="contact-page page-width">
      <div className="page-heading">
        <h1>
          It starts with <em>a hello.</em>
        </h1>
        <p>A project, a print, or an idea you haven’t quite figured out yet.</p>
      </div>
      <section className="contact-layout" aria-label="Contact Nicholas">
        <aside className="contact-postcard">
          <PhotoImage photo={heroPhotos[0]} priority />
          <div className="postcard-address">
            <span>From wherever you are.</span>
            <p>
              To Nicholas,
              <br />
              North Carolina
            </p>
            <a href={`mailto:${site.email}`}>{site.email}</a>
            <a href={site.instagram} target="_blank" rel="noreferrer">
              @nicholasgould1 <Arrow diagonal />
            </a>
          </div>
        </aside>
        <ContactForm
          emailEnabled={Boolean(
            process.env.RESEND_API_KEY && process.env.CONTACT_FROM_EMAIL,
          )}
          printTitle={printTitle}
          isPrint={params.interest === "print"}
        />
      </section>
    </main>
  );
}
