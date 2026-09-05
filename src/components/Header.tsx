"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Arrow } from "./Arrow";
const links = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/prints", label: "Prints" },
];
export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header
      className="site-header"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          document.getElementById("menu-toggle")?.focus();
        }
      }}
    >
      <Link
        href="/"
        className="wordmark"
        onClick={() => setOpen(false)}
        aria-label="Nicholas Gould photography home"
      >
        Nicholas Gould<span>Photography</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <Link href="/contact" className="header-contact">
        Let’s make something <Arrow diagonal />
      </Link>
      <button
        id="menu-toggle"
        className="menu-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        {open ? "Close" : "Menu"}
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      <nav
        id="mobile-nav"
        className="mobile-nav"
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {[...links, { href: "/contact", label: "Get in touch" }].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
          >
            {link.label}
            <Arrow diagonal />
          </Link>
        ))}
      </nav>
    </header>
  );
}
