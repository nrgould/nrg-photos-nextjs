"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Photo } from "@/lib/photography";
import { Arrow } from "./Arrow";
export default function Hero({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const photo = photos[index];
  return (
    <section className="hero" aria-label="Featured photography">
      <div className="hero-image" key={photo.src}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 700px) 160vh, 100vw"
          quality={85}
          preload={index === 0}
        />
      </div>
      <div className="hero-shade" />
      <div className="hero-content">
        <h1>
          Some places
          <br />
          <em>stay with you.</em>
        </h1>
        <Link href="/work" className="hero-link">
          Explore the photographs <Arrow />
        </Link>
      </div>
      <div className="hero-bottom">
        <p aria-live="polite">
          {photo.title}
          <span>Photographed by Nicholas Gould</span>
        </p>
        <div className="hero-controls">
          <span className="hero-count">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(photos.length).padStart(2, "0")}
          </span>
          <button
            onClick={() =>
              setIndex((index + photos.length - 1) % photos.length)
            }
            aria-label="Previous featured photograph"
          >
            <Arrow className="reverse" />
          </button>
          <button
            onClick={() => setIndex((index + 1) % photos.length)}
            aria-label="Next featured photograph"
          >
            <Arrow />
          </button>
        </div>
      </div>
    </section>
  );
}
