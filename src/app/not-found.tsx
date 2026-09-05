import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="empty-page">
      <h1>A little off the map.</h1>
      <p>This page isn’t here. There’s plenty to explore in the portfolio.</p>
      <Link className="text-link" href="/work">
        Back to the photographs
      </Link>
    </main>
  );
}
