"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Mail,
  Moon,
  Search,
  Shuffle,
  Sun,
  X,
} from "lucide-react";
import { travelPlaces, shuffleIndex } from "@/lib/places";
import { Button } from "./ui/button";
import MapZoom from "./MapZoom";
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

const MotionButton = motion.create(Button);
const separatorStyle: CSSProperties = {
  height: 20,
  width: 1,
  alignSelf: "center",
  flex: "0 0 1px",
};

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
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"globe" | "map">("globe");
  const [zoom, setZoom] = useState(3);
  const [intro, setIntro] = useState(true);
  const [revision, setRevision] = useState(0);
  const [zoomRevision, setZoomRevision] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(false);
  const [compactFraction, setCompactFraction] = useState(0.25);
  const [snap, setSnap] = useState<number | string | null>(0.25);
  const [command, setCommand] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [drawerElement, setDrawerElement] = useState<HTMLDivElement | null>(
    null,
  );
  const dragged = useRef(false);
  const gestureStart = useRef<[number, number] | null>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const drawerViewport = useRef<HTMLDivElement>(null);
  const photoLayout = useRef<HTMLDivElement>(null);
  const drawerOrigin = useRef<HTMLElement | SVGElement | null>(null);
  const drawerHandle = useRef<HTMLButtonElement>(null);
  const photoFocus = useRef<HTMLButtonElement | null>(null);
  function changeSnap(next: number | string | null) {
    setSnap(next);
    if (next === 0.25) gallery.current?.scrollTo(0, 0);
  }
  const place = travelPlaces[selected];
  const expanded = Number(snap) >= 0.75;
  useEffect(() => {
    const viewport = drawerViewport.current;
    const scroller = gallery.current;
    const layout = photoLayout.current;
    if (!drawerElement || !viewport || !scroller || !layout) return;
    const figures = Array.from(layout.children) as HTMLElement[];
    const images = figures.map((figure) =>
      figure.querySelector<HTMLElement>(".gallery-photo")!,
    );
    const captions = figures.map((figure) =>
      figure.querySelector("figcaption")!,
    );
    let frame = 0;
    let transitioning = false;
    let previous = "";
    const mix = (from: number, to: number, progress: number) =>
      from + (to - from) * progress;

    function renderLayout() {
      frame = 0;
      const bounds = drawerElement!.getBoundingClientRect();
      const galleryBounds = scroller!.getBoundingClientRect();
      const height = Math.max(
        0,
        Math.min(bounds.height, window.innerHeight - bounds.top),
      );
      const signature = `${height.toFixed(2)}:${bounds.width}:${bounds.height}`;
      if (signature !== previous) {
        previous = signature;
        const compactHeight = bounds.height * compactFraction;
        const progress = Math.max(
          0,
          Math.min(
            1,
            (height - compactHeight) / (bounds.height * 0.75 - compactHeight),
          ),
        );
        const growth = Math.max(0, (progress - 0.2) / 0.8);
        const lift = Math.min(1, progress / 0.2);
        const width = galleryBounds.width - 32;
        const count = figures.length;
        const compactWidth = (width - 8 * (count - 1)) / count;
        const headerHeight = galleryBounds.top - bounds.top;
        const safeArea =
          parseFloat(getComputedStyle(viewport!).paddingBottom) || 0;
        const compactImageHeight = Math.max(
          64,
          compactHeight - headerHeight - safeArea - 12,
        );
        const gap = mix(8, 12, growth);
        const captionHeight = 38 * growth;
        const halfWidth = (width - 12) / 2;
        const firstTargetHeight =
          count === 2
            ? (width * place.photos[0].height) / place.photos[0].width
            : count === 3
              ? width * 0.75
              : halfWidth * 1.25;
        const firstHeight = mix(compactImageHeight, firstTargetHeight, growth);
        let contentHeight = 0;

        figures.forEach((figure, index) => {
          const lowerRow =
            count === 2 ? index > 0 : count === 3 ? index > 0 : index > 1;
          const fullWidth = count === 2 || (count === 3 && index === 0);
          const targetWidth = fullWidth ? width : halfWidth;
          const targetX = fullWidth
            ? 0
            : ((count === 3 ? index - 1 : index) % 2) * (halfWidth + 12);
          const targetHeight =
            count === 2
              ? (width * place.photos[index].height) / place.photos[index].width
              : count === 3 && index === 0
                ? width * 0.75
                : halfWidth * 1.25;
          const imageHeight = mix(compactImageHeight, targetHeight, growth);
          const x = mix(index * (compactWidth + 8), targetX, growth);
          const y = lowerRow ? (firstHeight + captionHeight + gap) * lift : 0;
          figure.style.width = `${mix(compactWidth, targetWidth, growth)}px`;
          figure.style.transform = `translate(${x}px, ${y}px)`;
          images[index].style.height = `${imageHeight}px`;
          captions[index].style.opacity = String(growth);
          contentHeight = Math.max(
            contentHeight,
            y + imageHeight + captionHeight,
          );
        });
        viewport!.style.height = `${height}px`;
        layout!.style.height = `${contentHeight}px`;
        frame = requestAnimationFrame(renderLayout);
      } else if (transitioning) {
        frame = requestAnimationFrame(renderLayout);
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(renderLayout);
    };
    const transition = (event: TransitionEvent) => {
      if (event.target !== drawerElement || event.propertyName !== "transform")
        return;
      transitioning = event.type === "transitionrun";
      schedule();
    };
    // Observe Vaul's transform; this does not write to or animate the drawer shell.
    const changes = new MutationObserver(schedule);
    changes.observe(drawerElement, {
      attributes: true,
      attributeFilter: ["style", "data-state"],
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(drawerElement);
    drawerElement.addEventListener("transitionrun", transition);
    drawerElement.addEventListener("transitionend", transition);
    drawerElement.addEventListener("transitioncancel", transition);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      changes.disconnect();
      resize.disconnect();
      drawerElement.removeEventListener("transitionrun", transition);
      drawerElement.removeEventListener("transitionend", transition);
      drawerElement.removeEventListener("transitioncancel", transition);
    };
  }, [drawerElement, compactFraction, place.photos]);
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
          </div>
          <PlacesMap
            canvasOpen={open}
            selected={selected}
            mode={mode}
            zoom={zoom}
            onZoomChange={(nextZoom, nextMode) => {
              setZoom(nextZoom);
              setMode(nextMode);
              setIntro(false);
            }}
            theme={theme}
            intro={intro}
            revision={revision}
            zoomRevision={zoomRevision}
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
        </div>
      </div>
      <div
        className="explorer-bottom-controls"
        data-drawer-open={open}
        data-drawer-snap={open ? snap : 0}
        inert={open && expanded}
        style={
          {
            "--drawer-compact-height": `${compactFraction * 100}dvh`,
          } as CSSProperties
        }
      >
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
        <div className="explorer-command-bar" aria-label="Location navigation">
          <div className="travel-commands">
            <Control
              variant="quiet"
              label="Back"
              onClick={() =>
                choose(
                  (selected - 1 + travelPlaces.length) % travelPlaces.length,
                )
              }
            >
              <ArrowLeft size={18} />
            </Control>
            <Separator orientation="vertical" style={separatorStyle} />
            <Control
              variant="quiet"
              label="Shuffle"
              onClick={() =>
                choose(shuffleIndex(selected, travelPlaces.length))
              }
            >
              <Shuffle size={18} />
            </Control>
            <Separator orientation="vertical" style={separatorStyle} />
            <Control
              variant="quiet"
              label="Next"
              onClick={() => choose((selected + 1) % travelPlaces.length)}
            >
              <ArrowRight size={18} />
            </Control>
            <Separator orientation="vertical" style={separatorStyle} />
            <MapZoom
              mode={mode}
              zoom={zoom}
              onChange={(nextMode, nextZoom) => {
                setZoomRevision((value) => value + 1);
                setIntro(false);
                setMode(nextMode);
                setZoom(nextZoom);
              }}
            />
          </div>
        </div>
      </div>
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
          ref={setDrawerElement}
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
            if (
              viewer !== null ||
              command ||
              document.querySelector(".map-zoom-popover[data-open]")
            )
              event.preventDefault();
          }}
        >
          <div
            ref={drawerViewport}
            className="drawer-visible-content"
            style={{
              height: `${(snap === 0.25 ? compactFraction : Number(snap)) * 100}dvh`,
            }}
          >
            <MotionButton
              variant="quiet"
              press={false}
              whileTap={reducedMotion ? undefined : { scaleX: 0.96 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
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
                  <span className="sr-only">
                    . Map reference: {place.referenceLabel}.
                  </span>
                </DrawerDescription>
              </div>
              <Button
                variant="quiet"
                className="drawer-browse"
                aria-label={
                  expanded ? "Collapse photographs" : "Browse photographs"
                }
                onClick={() => changeSnap(expanded ? 0.25 : 0.75)}
              >
                {!expanded && <span>Browse</span>}
                {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </Button>
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
              data-photo-count={place.photos.length}
              data-vaul-no-drag={expanded ? "" : undefined}
              tabIndex={0}
              aria-label={`${place.name} photographs`}
              onWheel={(event) => {
                if (!expanded && event.deltaY > 0) changeSnap(0.75);
              }}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (
                  !expanded &&
                  ["ArrowDown", "PageDown", " "].includes(event.key)
                ) {
                  event.preventDefault();
                  changeSnap(0.75);
                }
              }}
            >
              <div ref={photoLayout} className="drawer-photo-layout">
                {place.photos.map((photo, index) => (
                  <figure key={photo.src}>
                    <MotionButton
                      variant="quiet"
                      press={false}
                      whileTap={reducedMotion ? undefined : { scale: 0.975 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 28,
                      }}
                      className="gallery-photo"
                      aria-label={`View ${photo.title}`}
                      onClick={(event) => {
                        if (event.detail > 0 && dragged.current) return;
                        photoFocus.current = event.currentTarget;
                        setViewer(index);
                      }}
                    >
                      <PhotoImage
                        photo={photo}
                        sizes={
                          place.photos.length === 2 ||
                          (place.photos.length === 3 && index === 0)
                            ? "(max-width: 700px) calc(100vw - 32px), 358px"
                            : "(max-width: 700px) calc(50vw - 22px), 173px"
                        }
                      />
                    </MotionButton>
                    <figcaption>{photo.title}</figcaption>
                  </figure>
                ))}
              </div>
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
