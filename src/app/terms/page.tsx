import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/SeoContent";
import { contentMetadata } from "@/lib/seo-content";
import { site } from "@/lib/site";

export const generateMetadata = () =>
  contentMetadata(
    "Terms of sale",
    "Terms for buying Nicholas Gould’s Lightroom presets: license, 14-day refunds and the free challenge preset.",
    "/terms",
  );

const email = <a href={`mailto:${site.email}`}>{site.email}</a>;

export default function TermsPage() {
  return (
    <main id="main" className="page-width collection-page">
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Terms of sale", path: "/terms" },
        ]}
      />
      <div className="page-heading">
        <h1>Terms of sale</h1>
        <p>Last updated October 5, 2026</p>
      </div>
      <div className="legal">
        <section>
          <h2>Seller</h2>
          <p>
            Presets on this site are sold by NRG Studios, LLC, a North Carolina
            company owned by photographer Nicholas Gould. Questions go to{" "}
            {email}.
          </p>
        </section>
        <section>
          <h2>What you buy</h2>
          <p>
            Each preset is a Lightroom preset file (.xmp). Prices are in US
            dollars: $1.99 per preset, with 20% off a cart of ten or more.
            Stripe processes payment. Once payment clears, your presets are in
            your library on this site, ready to download whenever you are signed
            in.
          </p>
          <p>
            Checkout works without an email. Add one to your account to keep
            your presets on other devices; without it, they stay in the browser
            you bought them in.
          </p>
        </section>
        <section>
          <h2>License</h2>
          <p>
            A purchase gives you a personal, non-exclusive, non-transferable
            license to use the preset on your own photographs, including photos
            you sell or deliver to clients. You may not share, resell, give away
            or publish the preset files, alone or as part of another collection.
            NRG Studios keeps the copyright in the presets.
          </p>
          <p>
            Every photograph is different, so results vary and some photos will
            need adjustment after applying a preset.
          </p>
        </section>
        <section id="refunds">
          <h2>Refunds</h2>
          <p>
            You can ask for a refund within 14 days of purchase, for any reason.
            Email {email} from the address you used at checkout, or include it,
            and name the presets. Refunds go back to the original payment method
            through Stripe. A refunded preset leaves your library and its
            license ends.
          </p>
          <p>
            After 14 days, sales are final unless the law requires otherwise. If
            a file will not download or open, email at any time and it will be
            fixed or refunded.
          </p>
        </section>
        <section>
          <h2>Free preset</h2>
          <p>
            Completing the map challenges unlocks one free preset per account,
            drawn at random from the presets the account does not own. It
            carries the same license, has no cash value and cannot be exchanged.
          </p>
        </section>
        <section>
          <h2>2025 preset pack</h2>
          <p>
            If you bought the 2025 preset pack, sign in with the email you used
            then. The pack’s presets that are still sold here appear in your
            library.
          </p>
        </section>
        <section>
          <h2>Liability</h2>
          <p>
            Presets are provided as is. To the extent the law allows, our total
            liability for any claim is limited to the amount you paid for the
            preset involved.
          </p>
        </section>
        <section>
          <h2>Changes</h2>
          <p>
            These terms may change. The version in place when you buy applies to
            that purchase. North Carolina law governs these terms. How your
            information is handled is in the{" "}
            <Link href="/privacy">privacy</Link> policy.
          </p>
        </section>
      </div>
    </main>
  );
}
