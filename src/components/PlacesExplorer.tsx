"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Globe2,
  Heart,
  Layers,
  Map,
  Moon,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { travelPlaces } from "@/lib/places";
import {
  addPack,
  curatedPacks,
  emptyCollection,
  packManifest,
  presets,
  restoreCollection,
  shuffleIndex,
  toggleId,
  type CollectionState,
} from "@/lib/presets";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./ui/dialog";
import PhotoImage from "./PhotoImage";
import Lightbox from "./Lightbox";
import PlacesMap from "./PlacesMap";
import SignatureCollection from "./SignatureCollection";

const storageKey = "photography-collection-v1";
export default function PlacesExplorer() {
  const [selected, setSelected] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [mode, setMode] = useState<"globe" | "map">("globe");
  const [zoom, setZoom] = useState(1);
  const [intro, setIntro] = useState(true);
  const [revision, setRevision] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [glass, setGlass] = useState(false);
  const [collection, setCollection] =
    useState<CollectionState>(emptyCollection);
  const [collectionView, setCollectionView] = useState<
    "saved" | "presets" | null
  >(null);
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  const [viewer, setViewer] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [checkout, setCheckout] = useState(false);
  const ready = useRef(false);
  const place = travelPlaces[selected];
  const photo = place.photos[photoIndex];
  const recipes = presets.filter((p) => p.placeIds.includes(place.id));
  const savedCount = collection.photos.length + collection.places.length;
  function finishIntro() {
    setIntro(false);
    setMode("map");
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {
      /* Browsing works without storage. */
    }
  }
  function choose(index: number, nextPhoto = 0) {
    setSelected(index);
    setPhotoIndex(nextPhoto);
    setViewer(null);
    setIntro(false);
    setRevision((r) => r + 1);
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {
      /* Optional preference. */
    }
  }
  function changeTheme(next: "light" | "dark") {
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.photoTheme = next;
    void root.offsetHeight;
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
    setTheme(next);
    try {
      localStorage.setItem("photography-theme", next);
    } catch {
      /* Optional preference. */
    }
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setCollection(restoreCollection(localStorage.getItem(storageKey)));
        const stored = localStorage.getItem("photography-theme");
        const next =
          stored === "dark" || stored === "light"
            ? stored
            : window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light";
        setTheme(next);
        document.documentElement.dataset.photoTheme = next;
        if (
          sessionStorage.getItem("photo-map-intro") ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
          setIntro(false);
          setMode("map");
        }
      } catch {
        setMessage(
          "Saving is unavailable in this browser. Your collection lasts for this visit.",
        );
      }
      ready.current = true;
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(collection));
    } catch {
      /* The in-memory collection remains usable. */
    }
  }, [collection]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((open) => !open);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  function toggle(kind: keyof CollectionState, id: string) {
    setCollection((c) => ({ ...c, [kind]: toggleId(c[kind], id) }));
    setCheckout(false);
  }
  function addCurated(ids: string[]) {
    setCollection((c) => ({ ...c, presets: addPack(c.presets, ids) }));
    setCheckout(false);
    setMessage("Pack added to your selection.");
  }
  function exportSelection() {
    const blob = new Blob(
      [JSON.stringify(packManifest(collection.presets), null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-sample-preset-pack.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Sample selection exported. No purchase was made.");
  }
  return (
    <>
      <div className="explorer-top">
        <div>
          <p className="eyebrow">A photographic atlas</p>
          <h1>Places & presets</h1>
        </div>
        <div className="explorer-actions">
          <Button
            variant="control"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            onClick={() => changeTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
          </Button>
          <Button variant="control" onClick={() => setCollectionView("saved")}>
            <Heart size={16} /> Saved{" "}
            <span className="count">{savedCount}</span>
          </Button>
          <Button
            variant="solid"
            className="explorer-pack-cta"
            onClick={() => setCollectionView("presets")}
          >
            <Layers size={16} /> Build a preset pack{" "}
            <span className="count">{collection.presets.length}</span>
          </Button>
        </div>
      </div>
      <div className={`explorer-workspace ${glass ? "has-glass" : ""}`}>
        <div className="map-workspace">
          <div className="map-toolbar">
            <Button
              variant="control"
              onClick={() => {
                setQuery("");
                setCommand(true);
              }}
            >
              <Search size={16} /> Find a place <kbd>⌘ K</kbd>
            </Button>
            <div className="segmented" aria-label="Map projection">
              <Button
                variant="control"
                aria-pressed={mode === "map"}
                onClick={() => {
                  setIntro(false);
                  setMode("map");
                }}
              >
                <Map size={16} /> Map
              </Button>
              <Button
                variant="control"
                aria-pressed={mode === "globe"}
                onClick={() => {
                  setIntro(false);
                  setMode("globe");
                }}
              >
                <Globe2 size={16} /> Globe
              </Button>
            </div>
          </div>
          <PlacesMap
            selected={selected}
            mode={mode}
            zoom={zoom}
            intro={intro}
            revision={revision}
            onChoose={choose}
            onIntroEnd={finishIntro}
          />
          {intro && (
            <Button
              variant="control"
              className="skip-intro"
              onClick={finishIntro}
            >
              Start exploring
            </Button>
          )}
          <div className="map-controls">
            <div className="zoom-control tactile">
              <label htmlFor="map-zoom">
                Zoom <span>{["World", "Region", "Local"][zoom]}</span>
              </label>
              <input
                id="map-zoom"
                type="range"
                min="0"
                max="2"
                step="1"
                value={zoom}
                aria-valuetext={["World", "Region", "Local"][zoom]}
                disabled={mode === "globe"}
                onChange={(e) => {
                  setIntro(false);
                  setZoom(Number(e.target.value));
                }}
                list="zoom-stops"
              />
              <datalist id="zoom-stops">
                <option value="0" label="World" />
                <option value="1" label="Region" />
                <option value="2" label="Local" />
              </datalist>
              <div className="zoom-labels">
                <span>World</span>
                <span>Region</span>
                <span>Local</span>
              </div>
            </div>
            <Button variant="control" onClick={() => setRevision((r) => r + 1)}>
              Recenter
            </Button>
            <Button
              variant="control"
              aria-label="Glass controls"
              aria-pressed={glass}
              onClick={() => setGlass((v) => !v)}
            >
              <SlidersHorizontal size={16} />
              <span className="glass-label">Glass</span>
            </Button>
          </div>
        </div>
      </div>
      <div
        className="explorer-command-bar tactile"
        aria-label="Location navigation"
      >
        <div className="location-tabs">
          {travelPlaces.map((p, i) => (
            <button
              key={p.id}
              aria-pressed={selected === i}
              onClick={() => choose(i)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="travel-commands">
          <Button
            variant="control"
            onClick={() =>
              choose((selected - 1 + travelPlaces.length) % travelPlaces.length)
            }
          >
            <ArrowLeft size={16} /> Back
          </Button>
          <Button
            variant="control"
            onClick={() => choose(shuffleIndex(selected, travelPlaces.length))}
          >
            <Shuffle size={16} /> Shuffle
          </Button>
          <Button
            variant="control"
            onClick={() => choose((selected + 1) % travelPlaces.length)}
          >
            Next <ArrowRight size={16} />
          </Button>
        </div>
      </div>
      <section className="place-story" aria-label="Selected location">
        <div className="place-heading">
          <div>
            <p className="eyebrow">
              {String(selected + 1).padStart(2, "0")} /{" "}
              {String(travelPlaces.length).padStart(2, "0")}
            </p>
            <h2>{place.location}</h2>
            <p>{place.name}</p>
          </div>
          <Button
            variant="control"
            aria-label={`${collection.places.includes(place.id) ? "Unsave" : "Save"} ${place.name}`}
            aria-pressed={collection.places.includes(place.id)}
            onClick={() => toggle("places", place.id)}
          >
            <Heart
              size={18}
              fill={
                collection.places.includes(place.id) ? "currentColor" : "none"
              }
            />
          </Button>
        </div>
        <div className="place-story-body">
          <div className="place-story-photo">
            {" "}
            <button
              className="explorer-photo"
              onClick={() => setViewer(photoIndex)}
              aria-label={`View ${photo.title}`}
            >
              <PhotoImage
                photo={photo}
                priority
                sizes="(max-width: 700px) 90vw, 55vw"
              />
              <span>View photograph</span>
            </button>
            <div className="photo-caption">
              <span>{photo.title}</span>
              <Button
                variant="control"
                aria-label={`${collection.photos.includes(photo.src) ? "Unsave" : "Save"} photograph`}
                aria-pressed={collection.photos.includes(photo.src)}
                onClick={() => toggle("photos", photo.src)}
              >
                <Heart
                  size={15}
                  fill={
                    collection.photos.includes(photo.src)
                      ? "currentColor"
                      : "none"
                  }
                />
              </Button>
            </div>
            <div className="photo-strip">
              {place.photos.map((item, i) => (
                <button
                  key={item.src}
                  aria-label={`Show ${item.title}`}
                  aria-pressed={i === photoIndex}
                  onClick={() => setPhotoIndex(i)}
                >
                  <PhotoImage photo={item} sizes="80px" />
                </button>
              ))}
            </div>
          </div>
          <div className="place-story-edits">
            {" "}
            <div className="preset-heading">
              <h3>The edits</h3>
              <span className="sample-label">Sample recipes</span>
            </div>
            {recipes.map((preset) => (
              <div key={preset.id} className="preset-row">
                <div>
                  <h4>{preset.name}</h4>
                  <p>{preset.note}</p>
                  <details>
                    <summary>Recipe & photograph</summary>
                    <dl>
                      {preset.adjustments.map((a) => (
                        <div key={a.label}>
                          <dt>{a.label}</dt>
                          <dd>{a.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <button
                      className="recipe-photo-link"
                      onClick={() => {
                        const pi = travelPlaces.findIndex((p) =>
                          p.photos.some(
                            (photo) => photo.src === preset.photoSrc,
                          ),
                        );
                        const fi = travelPlaces[pi].photos.findIndex(
                          (photo) => photo.src === preset.photoSrc,
                        );
                        choose(pi, fi);
                      }}
                    >
                      View linked photograph
                    </button>
                    <p>Illustrative association, not verified edit history.</p>
                  </details>
                </div>
                <Button
                  variant="control"
                  aria-label={`${collection.presets.includes(preset.id) ? "Remove" : "Add"} ${preset.name}`}
                  aria-pressed={collection.presets.includes(preset.id)}
                  onClick={() => toggle("presets", preset.id)}
                >
                  {collection.presets.includes(preset.id) ? (
                    <Check size={16} />
                  ) : (
                    "+"
                  )}
                </Button>
              </div>
            ))}
            <button
              className="browse-packs"
              onClick={() => setCollectionView("presets")}
            >
              Browse curated packs <Layers size={15} />
            </button>
          </div>
        </div>
      </section>
      <SignatureCollection photo={photo} />
      <div className="explorer-foot">
        <p>
          Original photographs. Real collection catalog. Sample map recipes.
        </p>
        <Link href="/contact">Contact Nicholas</Link>
      </div>
      <p role="status" className="explorer-status">
        {message}
      </p>
      <Lightbox
        photos={place.photos}
        index={viewer}
        onIndexChange={setViewer}
      />
      <Dialog
        open={collectionView !== null}
        onOpenChange={(open) => {
          if (!open) setCollectionView(null);
        }}
      >
        <DialogContent
          variant="panel"
          className="collection-dialog explorer-overlay top-[7vh] max-h-[86dvh] overflow-y-auto"
        >
          <div className="dialog-heading">
            <DialogTitle>Your collection</DialogTitle>
            <DialogClose
              render={<Button variant="control" />}
              aria-label="Close collection"
            >
              <X size={18} />
            </DialogClose>
          </div>
          <div className="segmented collection-tabs">
            <Button
              variant="control"
              aria-pressed={collectionView === "saved"}
              onClick={() => setCollectionView("saved")}
            >
              Saved ({savedCount})
            </Button>
            <Button
              variant="control"
              aria-pressed={collectionView === "presets"}
              onClick={() => setCollectionView("presets")}
            >
              Preset pack ({collection.presets.length})
            </Button>
          </div>
          {collectionView === "saved" ? (
            <div className="collection-body">
              {savedCount === 0 && (
                <p className="empty-collection">
                  Keep a place or photograph here with the heart button.
                </p>
              )}
              {collection.places.map((id) => {
                const index = travelPlaces.findIndex((p) => p.id === id);
                const p = travelPlaces[index];
                return (
                  <div className="saved-row" key={id}>
                    <button
                      onClick={() => {
                        choose(index);
                        setCollectionView(null);
                      }}
                    >
                      <span>Place</span>
                      <strong>{p.name}</strong>
                      <small>{p.location}</small>
                    </button>
                    <Button
                      variant="control"
                      aria-label={`Remove saved ${p.name}`}
                      onClick={() => toggle("places", id)}
                    >
                      <X size={15} />
                    </Button>
                  </div>
                );
              })}
              {collection.photos.map((src) => {
                const index = travelPlaces.findIndex((p) =>
                  p.photos.some((photo) => photo.src === src),
                );
                const p = travelPlaces[index];
                const fi = p.photos.findIndex((photo) => photo.src === src);
                return (
                  <div className="saved-row" key={src}>
                    <button
                      onClick={() => {
                        choose(index, fi);
                        setCollectionView(null);
                      }}
                    >
                      <PhotoImage photo={p.photos[fi]} sizes="100px" />
                      <strong>{p.photos[fi].title}</strong>
                    </button>
                    <Button
                      variant="control"
                      aria-label={`Remove saved ${p.photos[fi].title}`}
                      onClick={() => toggle("photos", src)}
                    >
                      <X size={15} />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="collection-body">
              <p className="sample-notice">
                Prototype catalog · sample recipes only. Preset files, verified
                edits and prices are not available yet.
              </p>
              <a
                className="browse-packs"
                href="#signature-collection"
                onClick={() => setCollectionView(null)}
              >
                View all 21 Signature Collection presets
              </a>
              <h3>Your custom pack</h3>
              {collection.presets.length === 0 && (
                <p className="empty-collection">
                  Add an edit at a location, or start with a curated pack.
                </p>
              )}
              {presets
                .filter((p) => collection.presets.includes(p.id))
                .map((p) => (
                  <div className="saved-row" key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.placeIds
                          .map(
                            (id) =>
                              travelPlaces.find((place) => place.id === id)!
                                .name,
                          )
                          .join(" · ")}
                      </small>
                    </div>
                    <Button
                      variant="control"
                      aria-label={`Remove ${p.name} from pack`}
                      onClick={() => toggle("presets", p.id)}
                    >
                      <X size={15} />
                    </Button>
                  </div>
                ))}
              <h3>Curated packs</h3>
              {curatedPacks.map((pack) => (
                <div className="curated-pack" key={pack.id}>
                  <div>
                    <h4>{pack.name}</h4>
                    <p>{pack.note}</p>
                    <small>{pack.presetIds.length} recipes</small>
                  </div>
                  <Button
                    variant="control"
                    aria-label={`Add ${pack.name}`}
                    onClick={() => addCurated(pack.presetIds)}
                  >
                    {pack.presetIds.every((id) =>
                      collection.presets.includes(id),
                    ) ? (
                      <Check size={16} />
                    ) : (
                      "+"
                    )}
                  </Button>
                </div>
              ))}
              <Button
                variant="solid"
                className="w-full mt-6"
                disabled={!collection.presets.length}
                onClick={() => setCheckout(true)}
              >
                Preview purchase{" "}
                <span>{collection.presets.length} recipes</span>
              </Button>
              {checkout && (
                <div className="checkout-preview" role="status">
                  <h4>Purchase preview</h4>
                  <p>
                    {collection.presets.length} unique sample recipes. Checkout
                    is not connected. No payment will be taken.
                  </p>
                  <Button variant="control" onClick={exportSelection}>
                    <Download size={15} /> Export sample selection
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={command} onOpenChange={setCommand}>
        <DialogContent
          variant="panel"
          className="command-dialog explorer-overlay"
        >
          <div className="dialog-heading">
            <DialogTitle>Go somewhere</DialogTitle>
            <DialogClose
              render={<Button variant="control" />}
              aria-label="Close search"
            >
              <X size={16} />
            </DialogClose>
          </div>
          <Input
            aria-label="Search locations and packs"
            placeholder="Search locations and packs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="command-results">
            {travelPlaces
              .filter((p) =>
                `${p.name} ${p.location}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <Button
                  key={p.id}
                  variant="control"
                  onClick={() => {
                    choose(travelPlaces.indexOf(p));
                    setCommand(false);
                  }}
                >
                  <Map size={16} />
                  {p.name}
                  <span>{p.location}</span>
                </Button>
              ))}
            {"presets packs".includes(query.toLowerCase()) && (
              <Button
                variant="control"
                onClick={() => {
                  setCommand(false);
                  setCollectionView("presets");
                }}
              >
                <Layers size={16} /> Build a preset pack
              </Button>
            )}
            {!travelPlaces.some((p) =>
              `${p.name} ${p.location}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            ) &&
              !"presets packs".includes(query.toLowerCase()) && (
                <p>No places or packs found.</p>
              )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
