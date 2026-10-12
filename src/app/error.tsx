"use client";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="empty-page">
      <h1>Something didn’t load.</h1>
      <p>Please try again, or email {site.email}.</p>
      <Button className="mt-2.5" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
