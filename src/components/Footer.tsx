import Link from "next/link";
import { site } from "@/lib/site";
import { Arrow } from "./Arrow";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/contact">
          Contact
          <Arrow diagonal />
        </Link>
      </div>
      <div className="footer-bottom">
        <Link href="/" className="footer-name">
          Nicholas Gould
        </Link>
        <p>North Carolina</p>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          Instagram
        </a>
        <span>© {new Date().getFullYear()} NRG Studios, LLC</span>
      </div>
    </footer>
  );
}
