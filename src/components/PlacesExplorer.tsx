"use client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Leaf,
  Moon,
  Search,
  ShoppingBag,
  Shuffle,
  Sun,
  X,
} from "lucide-react";
import { travelPlaces } from "@/lib/places";
import { drawerOwnsGesture, shouldDismissDrawer } from "@/lib/drawer-gesture";
import { getMapNode, getMapNodes, type MapNode } from "@/lib/map-hierarchy";
import { navigatePlaces } from "@/lib/map-filters";
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
import PresetCatalog from "./PresetCatalog";
import ExploreChallenges, {
  ExploreChallengesTrigger,
} from "./ExploreChallenges";
import { useExplorationProgress } from "./useExplorationProgress";
import PresetCartPanel from "./PresetCartPanel";
import { usePresetCart } from "./PresetCartProvider";
import { usePresetCommerceBoundary } from "./CommerceCartProvider";
import { AccountControl } from "./AccountControl";
import {
  createPresetCatalogState,
  type PresetCatalogState,
} from "@/lib/preset-commerce";

type DrawerMode = "photos" | "presets" | "cart" | "challenges";

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
  disabled = false,
}: {
  variant?: "control" | "quiet";
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="explorer-overlay">{label}</TooltipContent>
    </Tooltip>
  );
}
export default function PlacesExplorer({
  initialLocationId,
  initialCatalogState,
  initialView,
}: {
  initialLocationId?: string | null;
  initialCatalogState?: PresetCatalogState;
  initialView?: "catalog" | "cart";
}) {
  const initialNode = useMemo(
    () => getMapNode(initialLocationId ?? null, travelPlaces),
    [initialLocationId],
  );
  const reducedMotion = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(
    initialNode?.collectionId ?? travelPlaces[0].id,
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNode?.id ?? null,
  );
  const filteredPlaces = travelPlaces;
  const photoCount = filteredPlaces.reduce(
    (count, place) => count + place.photos.length,
    0,
  );
  const navigationDisabled =
    filteredPlaces.length === 0 ||
    (filteredPlaces.length === 1 && filteredPlaces[0].id === selected);
  const [mode, setMode] = useState<"globe" | "map">(
    initialNode ? "map" : "globe",
  );
  const [zoom, setZoom] = useState(initialNode ? 3.5 : 3);
  const [intro, setIntro] = useState(!initialNode && !initialView);
  const [revision, setRevision] = useState(0);
  const [zoomRevision, setZoomRevision] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(Boolean(initialNode || initialView));
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(
    initialView === "cart"
      ? "cart"
      : initialView === "catalog"
        ? "presets"
        : "photos",
  );
  const [photoFocusOpen, setPhotoFocusOpen] = useState(Boolean(initialNode));
  const { progress: explorationProgress, record: recordExploration } =
    useExplorationProgress();
  useEffect(() => {
    if (
      !initialView &&
      initialNode?.kind === "location" &&
      initialNode.precision === "regional"
    )
      recordExploration({
        type: "location-opened",
        locationId: initialNode.id,
      });
  }, [initialNode, initialView, recordExploration]);
  const [catalogState, setCatalogState] = useState(() =>
    createPresetCatalogState({ ...initialCatalogState, query: "" }),
  );
  const { checkout } = usePresetCommerceBoundary();
  const { cartIds, ownedPresetIds, addPreset, addPresets, removePreset } =
    usePresetCart();
  const checkoutParams = new URLSearchParams({ view: "cart" });
  if (selectedNodeId) checkoutParams.set("location", selectedNodeId);
  if (catalogState.query) checkoutParams.set("query", catalogState.query);
  if (catalogState.category !== "All")
    checkoutParams.set("category", catalogState.category);
  if (catalogState.selectedPresetId)
    checkoutParams.set("preset", catalogState.selectedPresetId);
  const photoSnap = useRef<number | string | null>(0.25);
  const photoScroll = useRef(0);
  const pendingPhotoScroll = useRef<number | null>(null);
  const catalogScroll = useRef(0);
  const [catalogScrollMemory] = useState(() => ({
    get: () => catalogScroll.current,
    set: (value: number) => {
      catalogScroll.current = value;
    },
  }));
  const [compactFraction, setCompactFraction] = useState(0.25);
  const [snap, setSnap] = useState<number | string | null>(
    initialView ? 0.75 : 0.25,
  );
  const [command, setCommand] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [drawerElement, setDrawerElement] = useState<HTMLDivElement | null>(
    null,
  );
  const dragged = useRef(false);
  const gestureStart = useRef<{
    x: number;
    y: number;
    height: number;
    scrollTop: number;
    canScroll: boolean;
    owner: "drawer" | "scroll" | null;
  } | null>(null);
  const dismissOnRelease = useRef(false);
  const gallery = useRef<HTMLDivElement>(null);
  const drawerViewport = useRef<HTMLDivElement>(null);
  const photoLayout = useRef<HTMLDivElement>(null);
  const drawerOrigin = useRef<HTMLElement | SVGElement | null>(null);
  const photoOrigin = useRef<HTMLElement | SVGElement | null>(null);
  const drawerHandle = useRef<HTMLButtonElement>(null);
  const photoFocus = useRef<HTMLButtonElement | null>(null);
  const presetsTrigger = useRef<HTMLButtonElement | null>(null);
  const cartTrigger = useRef<HTMLButtonElement | null>(null);
  const challengesTrigger = useRef<HTMLButtonElement | null>(null);
  function changeSnap(next: number | string | null) {
    const value = drawerMode === "photos" ? next : Math.max(0.75, Number(next));
    setSnap(value);
    if (drawerMode === "photos") {
      photoSnap.current = value;
      if (value === 0.25) {
        photoScroll.current = 0;
        gallery.current?.scrollTo(0, 0);
      }
    }
  }
  function closeDrawer() {
    if (drawerMode === "photos") {
      photoScroll.current = gallery.current?.scrollTop ?? photoScroll.current;
      setPhotoFocusOpen(false);
    }
    setOpen(false);
  }
  function showPanel(
    next: Exclude<DrawerMode, "photos">,
    trigger?: HTMLElement,
  ) {
    if (drawerMode === "photos") {
      photoSnap.current = snap;
      photoScroll.current = gallery.current?.scrollTop ?? photoScroll.current;
    }
    drawerOrigin.current =
      trigger ??
      (next === "cart"
        ? cartTrigger.current
        : next === "challenges"
          ? challengesTrigger.current
          : presetsTrigger.current);
    setViewer(null);
    setDrawerMode(next);
    setSnap(0.75);
    setOpen(true);
    requestAnimationFrame(() =>
      drawerHandle.current?.focus({ preventScroll: true }),
    );
  }
  function showPhotos() {
    const node = getMapNode(selectedNodeId, filteredPlaces);
    if (node?.kind === "location" && node.precision === "regional")
      recordExploration({ type: "location-opened", locationId: node.id });
    pendingPhotoScroll.current = photoScroll.current;
    drawerOrigin.current = photoOrigin.current ?? presetsTrigger.current;
    setDrawerMode("photos");
    setSnap(photoSnap.current);
    setOpen(true);
    requestAnimationFrame(() => {
      gallery.current?.scrollTo(0, photoScroll.current);
      drawerHandle.current?.focus({ preventScroll: true });
    });
  }
  const place = useMemo(() => {
    const collection = filteredPlaces.find(
      (candidate) => candidate.id === selected,
    );
    const node = selectedNodeId
      ? getMapNode(selectedNodeId, filteredPlaces)
      : null;
    return collection && node
      ? {
          ...collection,
          name: node.label,
          photos: node.photos,
          referenceLabel: node.referenceLabel,
        }
      : collection;
  }, [filteredPlaces, selected, selectedNodeId]);
  const searchNodes = useMemo(
    () => [
      ...getMapNodes(filteredPlaces, "country"),
      ...getMapNodes(filteredPlaces, "location"),
    ],
    [filteredPlaces],
  );
  const locationCount = searchNodes.filter(
    (node) => node.kind === "location",
  ).length;
  const viewerIndex =
    place?.photos.findIndex((photo) => photo.src === viewer) ?? -1;
  const expanded = Number(snap) >= 0.75;
  function navigate(direction: "back" | "next" | "shuffle") {
    const id = navigatePlaces(filteredPlaces, selected, direction);
    if (id !== null) choose(id);
  }
  useEffect(() => {
    const viewport = drawerViewport.current;
    const scroller = gallery.current;
    const layout = photoLayout.current;
    if (
      drawerMode !== "photos" ||
      !drawerElement ||
      !viewport ||
      !scroller ||
      !layout ||
      !place
    )
      return;
    const photos = place.photos;
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
          count <= 2
            ? (width * photos[0].height) / photos[0].width
            : count === 3
              ? width * 0.75
              : halfWidth * 1.25;
        const firstHeight = mix(compactImageHeight, firstTargetHeight, growth);
        let contentHeight = 0;

        figures.forEach((figure, index) => {
          const lowerRow =
            count === 2 ? index > 0 : count === 3 ? index > 0 : index > 1;
          const fullWidth = count <= 2 || (count === 3 && index === 0);
          const targetWidth = fullWidth ? width : halfWidth;
          const targetX = fullWidth
            ? 0
            : ((count === 3 ? index - 1 : index) % 2) * (halfWidth + 12);
          const targetHeight =
            count <= 2
              ? (width * photos[index].height) / photos[index].width
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
        if (pendingPhotoScroll.current !== null) {
          scroller!.scrollTop = pendingPhotoScroll.current;
          const restoredFraction =
            photoSnap.current === 0.25
              ? compactFraction
              : Number(photoSnap.current);
          if (Math.abs(height - bounds.height * restoredFraction) < 1)
            pendingPhotoScroll.current = null;
        }
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
  }, [drawerElement, compactFraction, place, drawerMode]);
  function finishIntro() {
    setIntro(false);
    setMode("map");
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {}
  }
  function choose(id: string, showPhotos = false) {
    gallery.current?.scrollTo(0, 0);
    photoScroll.current = 0;
    pendingPhotoScroll.current = null;
    setDrawerMode("photos");
    if (drawerMode !== "photos") setSnap(photoSnap.current);
    setSelected(id);
    setSelectedNodeId(null);
    setViewer(null);
    setIntro(false);
    setRevision((r) => r + 1);
    setPhotoFocusOpen(open || showPhotos);
    if (showPhotos) {
      drawerOrigin.current =
        document.activeElement instanceof HTMLElement ||
        document.activeElement instanceof SVGElement
          ? document.activeElement
          : null;
      photoOrigin.current = drawerOrigin.current;
      photoSnap.current = 0.25;
      setSnap(0.25);
      setOpen(true);
      gallery.current?.scrollTo(0, 0);
    }
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {}
  }
  function chooseNode(node: MapNode) {
    if (node.kind === "location" && node.precision === "regional")
      recordExploration({ type: "location-opened", locationId: node.id });
    choose(node.collectionId, true);
    setSelectedNodeId(node.id);
    setMode("map");
    setZoom((current) => Math.max(current, 3.5));
  }
  function openPhotograph(photoSrc: string | null) {
    setViewer(photoSrc);
    if (photoSrc !== null)
      recordExploration({ type: "photo-opened", photoSrc });
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
        <ExploreChallengesTrigger
          progress={explorationProgress}
          expanded={open && drawerMode === "challenges"}
          triggerRef={challengesTrigger}
          onClick={() => showPanel("challenges")}
        />
        <Button
          ref={cartTrigger}
          variant="control"
          className="explorer-cart-trigger"
          aria-label={`Open cart, ${cartIds.length} ${cartIds.length === 1 ? "preset" : "presets"}`}
          onClick={(event) => showPanel("cart", event.currentTarget)}
        >
          <ShoppingBag size={18} aria-hidden="true" />
          {cartIds.length > 0 && (
            <span aria-hidden="true">{cartIds.length}</span>
          )}
        </Button>
      </div>
      <div className="explorer-workspace">
        <div className="map-workspace">
          <div className="map-toolbar">
            <Control label="Find a place" onClick={() => setCommand(true)}>
              <Search size={18} />
            </Control>
            <Button
              ref={presetsTrigger}
              variant="control"
              className="explorer-presets-trigger"
              aria-label="Browse all presets"
              onClick={(event) => showPanel("presets", event.currentTarget)}
            >
              All presets
            </Button>
          </div>
          <PlacesMap
            places={filteredPlaces}
            canvasOpen={photoFocusOpen}
            selected={selected}
            selectedNodeId={selectedNodeId}
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
            onChoose={(id) => choose(id, true)}
            onChooseNode={chooseNode}
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
        <div className="explorer-command-bar" aria-label="Location navigation">
          <div className="travel-commands">
            <Control
              variant="quiet"
              label="Back"
              disabled={navigationDisabled}
              onClick={() => navigate("back")}
            >
              <ArrowLeft size={18} />
            </Control>
            <Separator orientation="vertical" style={separatorStyle} />
            <Control
              variant="quiet"
              label="Shuffle"
              disabled={navigationDisabled}
              onClick={() => navigate("shuffle")}
            >
              <Shuffle size={18} />
            </Control>
            <Separator orientation="vertical" style={separatorStyle} />
            <Control
              variant="quiet"
              label="Next"
              disabled={navigationDisabled}
              onClick={() => navigate("next")}
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
          if (viewer === null) {
            if (next) setOpen(true);
            else closeDrawer();
          }
        }}
        modal={false}
        snapPoints={
          drawerMode === "photos" ? [compactFraction, 0.75, 1] : [0.75, 1]
        }
        activeSnapPoint={snap === 0.25 ? compactFraction : snap}
        setActiveSnapPoint={(value) =>
          changeSnap(value === compactFraction ? 0.25 : value)
        }
        scrollLockTimeout={0}
        onRelease={() => {
          if (dismissOnRelease.current) closeDrawer();
          dismissOnRelease.current = false;
        }}
        repositionInputs={false}
      >
        <DrawerContent
          ref={setDrawerElement}
          className="location-drawer explorer-overlay"
          data-expanded={expanded}
          data-snap={snap}
          data-drawer-mode={drawerMode}
          style={
            {
              "--drawer-compact-height": `${compactFraction * 100}dvh`,
            } as CSSProperties
          }
          aria-describedby={
            drawerMode === "photos"
              ? "location-photo-description"
              : "drawer-panel-description"
          }
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
            if (!event.isPrimary) {
              event.stopPropagation();
              return;
            }
            dragged.current = false;
            dismissOnRelease.current = false;
            const scroller = (event.target as HTMLElement).closest<HTMLElement>(
              "[data-drawer-scroll]",
            );
            gestureStart.current = {
              x: event.clientX,
              y: event.clientY,
              height: drawerViewport.current?.clientHeight ?? 0,
              scrollTop: scroller?.scrollTop ?? 0,
              canScroll: Boolean(
                scroller && scroller.scrollHeight > scroller.clientHeight + 1,
              ),
              owner: null,
            };
          }}
          onScrollCapture={(event) => {
            const scroller = event.target as HTMLElement;
            if (scroller.hasAttribute("data-drawer-scroll"))
              scroller.dataset.scrolled = String(scroller.scrollTop > 0);
          }}
          onPointerUpCapture={(event) => {
            if (!event.isPrimary) {
              event.stopPropagation();
              return;
            }
            const start = gestureStart.current;
            dismissOnRelease.current = Boolean(
              start?.owner === "drawer" &&
              event.currentTarget.classList.contains("vaul-dragging") &&
              shouldDismissDrawer(event.clientY - start.y, start.height),
            );
            gestureStart.current = null;
            const element = event.currentTarget;
            queueMicrotask(() => delete element.dataset.vaulNoDrag);
          }}
          onPointerCancelCapture={(event) => {
            gestureStart.current = null;
            dismissOnRelease.current = false;
            delete event.currentTarget.dataset.vaulNoDrag;
          }}
          onPointerMoveCapture={(event) => {
            const start = gestureStart.current;
            if (!event.isPrimary) {
              event.stopPropagation();
              return;
            }
            if (!start) return;
            const distanceY = event.clientY - start.y;
            if (Math.hypot(event.clientX - start.x, distanceY) <= 8) return;
            dragged.current = true;
            if (start.owner === null)
              start.owner = drawerOwnsGesture({ ...start, distanceY, expanded })
                ? "drawer"
                : "scroll";
            if (start.owner === "scroll")
              event.currentTarget.dataset.vaulNoDrag = "";
          }}
          onClickCapture={(event) => {
            if (event.detail > 0 && dragged.current) {
              event.preventDefault();
              event.stopPropagation();
            }
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
              aria-label={`Resize ${drawerMode === "photos" ? "photo" : drawerMode === "cart" ? "cart" : drawerMode === "challenges" ? "challenge" : "preset"} drawer, ${Number(snap) * 100} percent open`}
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
            {drawerMode === "photos" ? (
              <div className="photo-drawer-header">
                <div>
                  <DrawerTitle>{place?.name ?? "Photographs"}</DrawerTitle>
                  <DrawerDescription id="location-photo-description">
                    {place?.photos.length ?? 0}{" "}
                    {(place?.photos.length ?? 0) === 1
                      ? "photograph"
                      : "photographs"}
                    <span className="sr-only">
                      . Map reference: {place?.referenceLabel}.
                    </span>
                  </DrawerDescription>
                </div>
                <Button
                  variant="quiet"
                  className="drawer-presets-link"
                  onClick={() => showPanel("presets")}
                >
                  Presets
                </Button>
                <Button
                  variant="quiet"
                  className="drawer-browse"
                  aria-label={
                    expanded ? "Collapse photographs" : "Browse photographs"
                  }
                  onClick={() => changeSnap(expanded ? 0.25 : 0.75)}
                >
                  {!expanded && <span>Browse</span>}
                  {expanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronUp size={16} />
                  )}
                </Button>
                <Button
                  variant="control"
                  aria-label="Close photographs"
                  onClick={closeDrawer}
                >
                  <X size={18} />
                </Button>
              </div>
            ) : (
              <div className="drawer-commerce-header">
                <DrawerTitle className="sr-only">
                  {drawerMode === "cart"
                    ? "Your preset cart"
                    : drawerMode === "challenges"
                      ? "Exploration challenges"
                      : "All presets"}
                </DrawerTitle>
                <DrawerDescription
                  id="drawer-panel-description"
                  className="sr-only"
                >
                  {drawerMode === "challenges"
                    ? "Location and photo challenges."
                    : "Presets and cart."}
                </DrawerDescription>
                <div
                  className="drawer-mode-controls"
                  role="group"
                  aria-label="Drawer view"
                >
                  <AccountControl />
                  <Button
                    variant="quiet"
                    disabled={!place}
                    onClick={showPhotos}
                  >
                    Photos
                  </Button>
                  <Button
                    variant="quiet"
                    aria-pressed={drawerMode === "presets"}
                    onClick={() => showPanel("presets")}
                  >
                    Presets
                  </Button>
                  <Button
                    variant="quiet"
                    aria-label="Explore challenges"
                    aria-pressed={drawerMode === "challenges"}
                    onClick={() => showPanel("challenges")}
                  >
                    <Leaf size={16} aria-hidden="true" />
                  </Button>
                  <Button
                    variant="quiet"
                    aria-label={`Cart, ${cartIds.length} presets`}
                    aria-pressed={drawerMode === "cart"}
                    onClick={() => showPanel("cart")}
                  >
                    <ShoppingBag size={16} aria-hidden="true" />
                    <span>{cartIds.length}</span>
                  </Button>
                </div>
                <Button
                  variant="control"
                  aria-label="Close drawer"
                  onClick={closeDrawer}
                >
                  <X size={18} />
                </Button>
              </div>
            )}
            <div
              ref={gallery}
              className="drawer-gallery"
              data-drawer-scroll
              hidden={drawerMode !== "photos"}
              data-photo-count={place?.photos.length ?? 0}
              tabIndex={0}
              aria-label={place ? `${place.name} photographs` : "Photographs"}
              onScroll={(event) => {
                if (
                  drawerMode === "photos" &&
                  pendingPhotoScroll.current === null
                )
                  photoScroll.current = event.currentTarget.scrollTop;
              }}
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
                {place?.photos.map((photo, index) => (
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
                        openPhotograph(photo.src);
                      }}
                    >
                      <PhotoImage
                        photo={photo}
                        sizes={
                          place.photos.length <= 2 ||
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
            <div
              className="drawer-commerce-pane"
              hidden={drawerMode !== "presets"}
            >
              <PresetCatalog
                state={catalogState}
                onStateChange={setCatalogState}
                cartIds={cartIds}
                ownedPresetIds={ownedPresetIds}
                onAddPreset={addPreset}
                onAddCollection={addPresets}
                onRemovePreset={removePreset}
                scrollMemory={catalogScrollMemory}
              />
            </div>
            {drawerMode === "challenges" && (
              <div className="drawer-commerce-pane">
                <ExploreChallenges
                  progress={explorationProgress}
                  onBack={() => (place ? showPhotos() : closeDrawer())}
                  onRevealHint={(challengeId) =>
                    recordExploration({ type: "hint-revealed", challengeId })
                  }
                />
              </div>
            )}
            {drawerMode === "cart" && (
              <div className="drawer-commerce-pane">
                <PresetCartPanel
                  onBack={() => showPanel("presets")}
                  returnPath={`/explore?${checkoutParams}`}
                  checkout={checkout}
                />
              </div>
            )}
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
              {searchNodes.map((node) => (
                <CommandItem
                  key={node.id}
                  value={`${node.label} ${node.referenceLabel} ${filteredPlaces.find((collection) => collection.id === node.collectionId)?.name ?? ""} ${filteredPlaces.find((collection) => collection.id === node.collectionId)?.location ?? ""}`}
                  onSelect={() => {
                    chooseNode(node);
                    setCommand(false);
                  }}
                >
                  {node.label}
                  <span>
                    {node.kind === "country"
                      ? "All photographs"
                      : node.referenceLabel}
                  </span>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <Lightbox
        finalFocus={photoFocus}
        photos={place?.photos ?? []}
        index={viewerIndex < 0 ? null : viewerIndex}
        onIndexChange={(index) => {
          openPhotograph(
            index === null ? null : (place?.photos[index]?.src ?? null),
          );
        }}
      />
      <span className="sr-only" aria-live="polite">
        {place?.name ?? "No location selected"}. {photoCount}{" "}
        {photoCount === 1 ? "photograph" : "photographs"} in {locationCount}{" "}
        {locationCount === 1 ? "location" : "locations"}.
      </span>
    </TooltipProvider>
  );
}
