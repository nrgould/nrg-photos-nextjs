import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/SeoContent";
import { contentMetadata } from "@/lib/seo-content";
import { site } from "@/lib/site";

export const generateMetadata = () =>
  contentMetadata(
    "Privacy",
    "What this site collects when you buy presets, sign in or get in touch, and who processes it.",
    "/privacy",
  );

const email = <a href={`mailto:${site.email}`}>{site.email}</a>;

export default function PrivacyPage() {
  return (
    <main id="main" className="page-width collection-page">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ]}
      />
      <div className="page-heading">
        <h1>Privacy</h1>
        <p>Last updated October 5, 2026</p>
      </div>
      <div className="legal">
        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              Your email address, when you sign in or add it to your account. It
              is used to send sign-in codes, keep your purchases and answer you.
            </li>
            <li>
              Your purchases: which presets, the amounts, tax, dates, Stripe’s
              payment references and the email you enter at checkout, so signing
              in with it brings your presets to any device. Card details go to
              Stripe and never reach us.
            </li>
            <li>
              Your consent to new-preset emails, only if you tick the box, with
              the time you agreed. To stop them, email {email}.
            </li>
            <li>
              Which free preset your account received from the challenges.
            </li>
            <li>Your name, email and message when you use the contact form.</li>
          </ul>
        </section>
        <section>
          <h2>In your browser</h2>
          <p>
            Your cart, saved places and photos, challenge progress and theme are
            kept in your browser’s storage and are not sent to us. Sign-in uses
            cookies to keep you signed in, including the guest account that
            checkout creates when you have not added an email. There are no
            advertising or analytics cookies.
          </p>
        </section>
        <section>
          <h2>Who processes it</h2>
          <p>
            Supabase stores accounts and purchases, sends sign-in codes and
            delivers preset files. Stripe processes payments. Vercel hosts the
            site, keeps server logs, which include IP addresses, and counts page
            visits without cookies. Resend delivers contact form messages. Your
            information is never sold or shared for advertising.
          </p>
        </section>
        <section>
          <h2>Keeping and deleting</h2>
          <p>
            Purchase records are kept as long as you can download your presets
            and as tax and accounting rules require. Email {email} to see,
            correct or delete your information. Deleting your account removes
            your purchased presets with it.
          </p>
        </section>
        <section>
          <h2>Seller</h2>
          <p>
            NRG Studios, LLC, North Carolina. The{" "}
            <Link href="/terms">terms of sale</Link> cover licenses and refunds.
          </p>
        </section>
      </div>
    </main>
  );
}
