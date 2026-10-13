import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = { robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="empty-page">
      <h1>Page not found</h1>
      <p>This page doesn’t exist.</p>
      <Link
        className={buttonVariants({ variant: "link", className: "mt-2.5" })}
        href="/"
      >
        Back to the map
      </Link>
    </main>
  );
}
