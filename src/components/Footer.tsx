import Link from "next/link";
import { site } from "@/lib/site";
import { Arrow } from "./Arrow";
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <Link href="/contact">
          Let’s make it happen.
          <Arrow diagonal />
        </Link>
      </div>
      <div className="footer-bottom">
        <Link href="/" className="footer-name">
          Nicholas Gould
        </Link>
        <p>North Carolina & wherever the story goes.</p>
        <a href={site.instagram} target="_blank" rel="noreferrer">
          Instagram <Arrow diagonal />
        </a>
        <span>© {new Date().getFullYear()} NRG Studios, LLC</span>
      </div>
    </footer>
  );
}
