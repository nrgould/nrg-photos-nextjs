import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="empty-page">
      <h1>Page not found</h1>
      <p>This page doesn’t exist.</p>
      <Link
        className={buttonVariants({ variant: "link", className: "mt-2.5" })}
        href="/work"
      >
        View work
      </Link>
    </main>
  );
}
