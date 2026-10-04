"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Globe2,
  Map,
  Mail,
  Moon,
  Search,
  Shuffle,
  Sun,
  X,
} from "lucide-react";
import { travelPlaces } from "@/lib/places";
import { zoomStops, zoomLabels } from "@/lib/globe";
import { shuffleIndex } from "@/lib/presets";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Separator } from "./ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "./ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "./ui/drawer";
import PhotoImage from "./PhotoImage";
import Lightbox from "./Lightbox";
import PlacesMap from "./PlacesMap";

function Control({
  label,
  children,
  onClick,
  variant = "control",
}: {
  variant?: "control" | "quiet";
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant={variant} aria-label={label} onClick={onClick} />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="explorer-overlay">{label}</TooltipContent>
    </Tooltip>
  );
}
export default function PlacesExplorer() {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"globe" | "map">("globe");
  const [zoom, setZoom] = useState(2);
  const [intro, setIntro] = useState(true);
  const [revision, setRevision] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const [compactFraction, setCompactFraction] = useState(0.25);
  const [snap, setSnap] = useState<number | string | null>(0.25);
  const [command, setCommand] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const dragged = useRef(false);
  const gestureStart = useRef<[number, number] | null>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const drawerOrigin = useRef<HTMLElement | SVGElement | null>(null);
  const drawerHandle = useRef<HTMLButtonElement>(null);
  const photoFocus = useRef<HTMLButtonElement | null>(null);
  function changeSnap(next: number | string | null) {
    setSnap(next);
    if (next === 0.25) gallery.current?.scrollTo(0, 0);
  }
  const place = travelPlaces[selected];
  const expanded = Number(snap) >= 0.75;
  function finishIntro() {
    setIntro(false);
    setMode("map");
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {}
  }
  function choose(index: number, showPhotos = false) {
    gallery.current?.scrollTo(0, 0);
    setSelected(index);
    setViewer(null);
    setIntro(false);
    setRevision((r) => r + 1);
    if (showPhotos) {
      drawerOrigin.current =
        document.activeElement instanceof HTMLElement ||
        document.activeElement instanceof SVGElement
          ? document.activeElement
          : null;
      changeSnap(0.25);
      setOpen(true);
      gallery.current?.scrollTo(0, 0);
    }
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {}
  }
  function changeTheme() {
    const next = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    root.classList.add("theme-switching");
    root.dataset.photoTheme = next;
    void root.offsetHeight;
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
    setTheme(next);
    try {
      localStorage.setItem("photography-theme", next);
    } catch {}
  }
  useEffect(() => {
    const resize = () =>
      setCompactFraction(
        Math.min(0.5, Math.max(0.25, 180 / window.innerHeight)),
      );
    resize();
    window.addEventListener("resize", resize);
    const frame = requestAnimationFrame(() => {
      try {
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
      } catch {}
    });
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", listener);
    };
  }, []);
  return (
    <TooltipProvider delay={500}>
      <h1 className="sr-only">Photographs on the map</h1>
      <div className="explorer-top">
        <Control
          label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          onClick={changeTheme}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </Control>
      </div>
      <div className="explorer-workspace">
        <div className="map-workspace">
          <div className="map-toolbar">
            <Control label="Find a place" onClick={() => setCommand(true)}>
              <Search size={18} />
            </Control>
            <Control
              label={mode === "map" ? "Show globe" : "Show flat map"}
              onClick={() => {
                setIntro(false);
                setMode(mode === "map" ? "globe" : "map");
              }}
            >
              {mode === "map" ? <Globe2 size={18} /> : <Map size={18} />}
            </Control>
          </div>
          <PlacesMap
            canvasOpen={open}
            selected={selected}
            mode={mode}
            zoom={zoom}
            intro={intro}
            revision={revision}
            onChoose={(index) => choose(index, true)}
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
            <div className="zoom-control" data-disabled={mode === "globe"}>
              <div className="zoom-track">
                <div
                  className="zoom-fill"
                  style={{ width: `calc(36px + (100% - 36px) * ${zoom / 5})` }}
                />
                {zoomStops.map((_, index) => (
                  <span
                    key={index}
                    className={`zoom-dot ${index <= zoom ? "is-filled" : ""}`}
                    style={{
                      left: `calc(18px + (100% - 36px) * ${index / 5})`,
                    }}
                  />
                ))}
                <span
                  className="zoom-thumb"
                  style={{ left: `calc(18px + (100% - 36px) * ${zoom / 5})` }}
                />
                <Slider
                  className="map-zoom-slider"
                  aria-label="Map zoom"
                  value={[zoom]}
                  min={0}
                  max={5}
                  step={1}
                  aria-valuetext={zoomLabels[zoom]}
                  disabled={mode === "globe"}
                  onValueChange={(value) =>
                    setZoom(Array.isArray(value) ? value[0] : value)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="explorer-command-bar"
        data-drawer-open={open}
        data-drawer-snap={open ? snap : 0}
        style={
          {
            "--drawer-compact-height": `${compactFraction * 100}dvh`,
          } as CSSProperties
        }
        aria-label="Location navigation"
      >
        <div className="travel-commands">
          <Control
            variant="quiet"
            label="Back"
            onClick={() =>
              choose((selected - 1 + travelPlaces.length) % travelPlaces.length)
            }
          >
            <ArrowLeft size={18} />
          </Control>
          <Separator orientation="vertical" />
          <Control
            variant="quiet"
            label="Shuffle"
            onClick={() => choose(shuffleIndex(selected, travelPlaces.length))}
          >
            <Shuffle size={18} />
          </Control>
          <Separator orientation="vertical" />
          <Control
            variant="quiet"
            label="Next"
            onClick={() => choose((selected + 1) % travelPlaces.length)}
          >
            <ArrowRight size={18} />
          </Control>
        </div>
      </div>
      {!open && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="control"
                nativeButton={false}
                render={<Link href="/contact" />}
                className="floating-contact"
                aria-label="Contact Nicholas"
              />
            }
          >
            <Mail size={18} />
          </TooltipTrigger>
          <TooltipContent className="explorer-overlay">
            Contact Nicholas
          </TooltipContent>
        </Tooltip>
      )}
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (viewer === null) setOpen(next);
        }}
        modal={false}
        snapPoints={[compactFraction, 0.75, 1]}
        activeSnapPoint={snap === 0.25 ? compactFraction : snap}
        setActiveSnapPoint={(value) =>
          changeSnap(value === compactFraction ? 0.25 : value)
        }
        snapToSequentialPoint
        repositionInputs={false}
      >
        <DrawerContent
          className="location-drawer explorer-overlay"
          data-expanded={expanded}
          data-snap={snap}
          style={
            {
              "--drawer-compact-height": `${compactFraction * 100}dvh`,
            } as CSSProperties
          }
          aria-describedby="location-photo-description"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            drawerHandle.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const origin = drawerOrigin.current;
            if (origin?.isConnected) origin.focus({ preventScroll: true });
            else
              document
                .querySelector<HTMLButtonElement>(
                  'button[aria-label="Find a place"]',
                )
                ?.focus({ preventScroll: true });
          }}
          onPointerOutCapture={(event) => {
            // Keep Vaul's captured drag active when the pointer leaves a child.
            if (event.buttons !== 0) event.stopPropagation();
          }}
          onPointerDownCapture={(event) => {
            dragged.current = false;
            gestureStart.current = [event.clientX, event.clientY];
          }}
          onPointerUpCapture={() => {
            gestureStart.current = null;
          }}
          onPointerCancelCapture={() => {
            gestureStart.current = null;
          }}
          onPointerMoveCapture={(event) => {
            const start = gestureStart.current;
            if (
              start &&
              Math.hypot(event.clientX - start[0], event.clientY - start[1]) > 8
            )
              dragged.current = true;
          }}
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => {
            if (viewer !== null) event.preventDefault();
          }}
        >
          <div
            className="drawer-visible-content"
            style={{
              height: `${(snap === 0.25 ? compactFraction : Number(snap)) * 100}dvh`,
            }}
          >
            <Button
              variant="quiet"
              press={false}
              ref={drawerHandle}
              onClick={(event) => {
                if (event.detail === 0 || !dragged.current)
                  changeSnap(
                    Number(snap) === 0.25
                      ? 0.75
                      : Number(snap) === 0.75
                        ? 1
                        : 0.25,
                  );
              }}
              className="photo-drawer-grip"
              aria-label={`Resize photo drawer, ${Number(snap) * 100} percent open`}
              aria-hidden={false}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (
                  [
                    "Enter",
                    " ",
                    "ArrowUp",
                    "ArrowDown",
                    "Home",
                    "End",
                  ].includes(event.key)
                ) {
                  event.preventDefault();
                  if (event.key === "Home") changeSnap(0.25);
                  else if (event.key === "End") changeSnap(1);
                  else if (event.key === "ArrowDown")
                    changeSnap(Number(snap) === 1 ? 0.75 : 0.25);
                  else
                    changeSnap(
                      Number(snap) === 0.25
                        ? 0.75
                        : Number(snap) === 0.75
                          ? 1
                          : 0.25,
                    );
                }
              }}
            />
            <div className="photo-drawer-header" data-vaul-no-drag>
              <div>
                <DrawerTitle>{place.name}</DrawerTitle>
                <DrawerDescription id="location-photo-description">
                  {place.photos.length} photographs
                </DrawerDescription>
              </div>
              <Button
                variant="control"
                aria-label="Close photographs"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>
            <div
              ref={gallery}
              className="drawer-gallery"
              data-vaul-no-drag={expanded ? "" : undefined}
              tabIndex={0}
              aria-label={`${place.name} photographs`}
              onWheel={(event) => {
                if (!expanded && event.deltaY > 0) changeSnap(0.75);
              }}
              onKeyDown={(event) => {
                if (
                  !expanded &&
                  ["ArrowDown", "PageDown", " "].includes(event.key)
                ) {
                  event.preventDefault();
                  changeSnap(0.75);
                }
              }}
            >
              {place.photos.map((photo, index) => (
                <figure key={photo.src}>
                  <Button
                    variant="quiet"
                    press={false}
                    className="gallery-photo"
                    aria-label={`View ${photo.title}`}
                    onClick={(event) => {
                      if (event.detail > 0 && dragged.current) return;
                      photoFocus.current = event.currentTarget;
                      setViewer(index);
                    }}
                    onFocus={() => {
                      if (index > 0 && !expanded) changeSnap(0.75);
                    }}
                  >
                    <PhotoImage
                      photo={photo}
                      priority={index === 0}
                      sizes="(max-width: 700px) calc(100vw - 32px), 448px"
                    />
                  </Button>
                  <figcaption>{photo.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
      <Dialog open={command} onOpenChange={setCommand}>
        <DialogContent
          variant="panel"
          className="location-search explorer-overlay"
          finalFocus={() => (open ? drawerHandle.current : true)}
        >
          <DialogTitle className="sr-only">Find a place</DialogTitle>
          <Command>
            <CommandInput placeholder="Find a place…" />
            <CommandList>
              <CommandEmpty>No places found.</CommandEmpty>
              {travelPlaces.map((p, index) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.location}`}
                  onSelect={() => {
                    choose(index, true);
                    setCommand(false);
                  }}
                >
                  {p.name}
                  <span>{p.location}</span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Lightbox
        finalFocus={photoFocus}
        photos={place.photos}
        index={viewer}
        onIndexChange={(index) => {
          setViewer(index);
        }}
      />
      <span className="sr-only" aria-live="polite">
        {place.name}
      </span>
    </TooltipProvider>
  );
}
