"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="empty-page">
      <h1>Something didn’t load.</h1>
      <p>Please try again, or email nicholas@nicholasgouldphoto.com.</p>
      <button className="solid-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
