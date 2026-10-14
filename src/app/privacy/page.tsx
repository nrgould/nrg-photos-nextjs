import Link from "next/link";
import { SubpageNav } from "@/components/SiteNav";
import { ConsentBanner } from "@/components/ConsentBanner";
import { Breadcrumbs } from "@/components/seo/SeoContent";
import { contentMetadata } from "@/lib/seo-content";
import { site } from "@/lib/site";

export const generateMetadata = () =>
  contentMetadata(
    "Privacy",
    "What this site collects when you browse, buy presets, sign in or get in touch, and who processes it.",
    "/privacy",
  );

const email = <a href={`mailto:${site.email}`}>{site.email}</a>;

export default function PrivacyPage() {
  return (
    <>
      <SubpageNav />
      <main id="main" className="page-width collection-page">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Privacy", path: "/privacy" },
          ]}
        />
        <div className="page-heading">
          <h1>Privacy</h1>
          <p>Last updated October 12, 2026</p>
        </div>
        <div className="legal">
          <section>
            <h2>What we collect</h2>
            <ul>
              <li>
                Your email address, when you sign in or add it to your account.
                It is used to send sign-in codes, keep your purchases and answer
                you.
              </li>
              <li>
                Your purchases: which presets, the amounts, tax, dates, Stripe’s
                payment references and the email you enter at checkout, so
                signing in with it brings your presets to any device. Card
                details go to Stripe and never reach us.
              </li>
              <li>
                Your consent to new-preset emails, only if you tick the box,
                with the time you agreed. To stop them, email {email}.
              </li>
              <li>
                Which free preset your account received from the challenges.
              </li>
              <li>
                Your name, email and message when you use the contact form.
              </li>
              <li>
                How you use the site: the pages, places and photographs you
                open, what you search for, clicks, errors and load times. If you
                accept cookies, also a recording of your visit with what you
                type hidden, linked to your account once you sign in or check
                out.
              </li>
            </ul>
          </section>
          <section>
            <h2>In your browser</h2>
            <p>
              Your cart, saved places and photos, challenge progress and theme
              are kept in your browser’s storage and are not sent to us. Sign-in
              uses cookies to keep you signed in, including the guest account
              that checkout creates when you have not added an email. If you
              accept cookies, PostHog sets one that recognizes your browser
              between visits and records your visit. Until then, or if you
              decline, it counts visits without cookies and records nothing.
              There are no advertising cookies.
            </p>
            <ConsentBanner inline />
          </section>
          <section>
            <h2>Who processes it</h2>
            <p>
              Supabase stores accounts and purchases, sends sign-in codes and
              delivers preset files. Stripe processes payments as merchant of
              record. Vercel hosts the site, keeps server logs, which include IP
              addresses, and counts page visits without cookies. PostHog records
              how the site is used, as listed above. Resend delivers contact
              form messages. Your information is never sold or shared for
              advertising.
            </p>
          </section>
          <section>
            <h2>Security</h2>
            <p>
              The site only loads over HTTPS. You sign in with a one-time code
              sent to your email, so there is no password to store or leak.
              Accounts and purchase records sit in a database that refuses
              requests from browsers; only the site’s server reads them. Preset
              files are kept in private storage. The server checks that you own
              a preset before it makes a download link, and the link expires
              after 60 seconds. To report a security problem, email {email}.
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
              <Link href="/terms">terms of sale</Link> cover licenses and
              refunds.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
