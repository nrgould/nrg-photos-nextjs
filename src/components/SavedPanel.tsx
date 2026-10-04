"use client";

import { useId } from "react";
import { ArrowLeft, Heart, X } from "lucide-react";
import {
  nodeForPhoto,
  placeNode,
  type FavoriteKind,
  type Favorites,
} from "@/lib/favorites";
import type { MapNode } from "@/lib/map-hierarchy";
import { Button } from "@/components/ui/button";
import PhotoImage from "./PhotoImage";
import styles from "./ExploreChallenges.module.css";

export default function SavedPanel({
  favorites,
  onBack,
  onOpenPlace,
  onOpenPhoto,
  onToggle,
}: {
  favorites: Favorites;
  onBack: () => void;
  onOpenPlace: (node: MapNode) => void;
  onOpenPhoto: (src: string, trigger: HTMLButtonElement) => void;
  onToggle: (kind: FavoriteKind, id: string) => void;
}) {
  const id = useId();
  const places = favorites.placeIds.flatMap((placeId) => {
    const node = placeNode(placeId);
    return node ? [node] : [];
  });
  const photos = favorites.photoSrcs.flatMap((src) => {
    const photo = nodeForPhoto(src)?.photos.find((p) => p.src === src);
    return photo ? [photo] : [];
  });
  return (
    <section
      className={styles.panel}
      data-drawer-scroll
      aria-labelledby={`${id}-heading`}
    >
      <header className={styles.header}>
        <Button variant="quiet" className={styles.back} onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to photographs
        </Button>
        <div className={styles.heading}>
          <Heart size={22} strokeWidth={1.5} aria-hidden="true" />
          <h2 id={`${id}-heading`}>Saved</h2>
        </div>
      </header>
      <div className={styles.content}>
        {!places.length && !photos.length && (
          <p className={styles.notice}>Nothing saved yet.</p>
        )}
        {places.length > 0 && (
          <section aria-labelledby={`${id}-places`}>
            <h3 id={`${id}-places`} className={styles.savedHeading}>
              Places <span>{places.length}</span>
            </h3>
            <ul className={styles.savedPlaces}>
              {places.map((node) => (
                <li key={node.id}>
                  <Button
                    variant="quiet"
                    className={styles.savedPlace}
                    onClick={() => onOpenPlace(node)}
                  >
                    <PhotoImage photo={node.cover} sizes="48px" />
                    <span>
                      <strong>{node.label}</strong>
                      <span>
                        {node.photoCount}{" "}
                        {node.photoCount === 1 ? "photograph" : "photographs"}
                      </span>
                    </span>
                  </Button>
                  <Button
                    variant="quiet"
                    className={styles.savedRemove}
                    aria-label={`Remove ${node.label} from saved`}
                    onClick={() => onToggle("placeIds", node.id)}
                  >
                    <X size={16} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {photos.length > 0 && (
          <section aria-labelledby={`${id}-photos`}>
            <h3 id={`${id}-photos`} className={styles.savedHeading}>
              Photographs <span>{photos.length}</span>
            </h3>
            <ul className={styles.savedPhotos}>
              {photos.map((photo) => (
                <li key={photo.src}>
                  <Button
                    variant="quiet"
                    className={styles.savedPhoto}
                    aria-label={`View ${photo.title}`}
                    onClick={(event) =>
                      onOpenPhoto(photo.src, event.currentTarget)
                    }
                  >
                    <PhotoImage
                      photo={photo}
                      sizes="(max-width: 700px) 33vw, 120px"
                    />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </section>
  );
}
