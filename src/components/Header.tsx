"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AccountControl } from "./AccountControl";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
const links = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/explore", label: "Explore places" },
  { href: "/presets", label: "All presets" },
];
function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      className="wordmark"
      onClick={onClick}
      aria-label="Nicholas Gould photography home"
    >
      Nicholas Gould<span>Photography</span>
    </Link>
  );
}
export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = (href: string) =>
    pathname.startsWith(href) ? ("page" as const) : undefined;
  return (
    <header className="site-header">
      <Wordmark />
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current(link.href)}
          >
            {link.label}
          </Link>
        ))}
        <AccountControl />
      </nav>
      <Link href="/contact" className="header-contact">
        Contact
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="menu-toggle">
          Menu<span aria-hidden="true">+</span>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="site-header">
            <Wordmark onClick={() => setOpen(false)} />
            <SheetClose className="menu-toggle">
              Close<span aria-hidden="true">−</span>
            </SheetClose>
          </div>
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {[...links, { href: "/contact", label: "Contact" }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                aria-current={current(link.href)}
              >
                {link.label}
              </Link>
            ))}
            <AccountControl />
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
