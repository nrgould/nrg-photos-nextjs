"use client";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from "react";
import { motion, useMotionValue, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Heart,
  Star,
  Trash2,
  Mail,
  Menu as MenuIcon,
  Moon,
  Search,
  ShoppingBag,
  Shuffle,
  Sun,
  X,
} from "lucide-react";
import { selectionFeedback } from "@/lib/haptics";
import { heroSrcs, travelPlaces } from "@/lib/places";
import { galleryLayout, heroCount } from "@/lib/gallery-layout";
import Image from "next/image";
import { photoUrl, takenLabel } from "@/lib/photography";
import { drawerOwnsGesture, shouldDismissDrawer } from "@/lib/drawer-gesture";
import {
  getMapNode,
  getMapNodes,
  getPlacePresets,
  type MapNode,
} from "@/lib/map-hierarchy";
import { searchExplorer, shufflePlace, stepLocation } from "@/lib/map-filters";
import { Button } from "./ui/button";
import MapZoom from "./MapZoom";
import { Separator } from "./ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "./ui/drawer";
import PhotoImage from "./PhotoImage";
import Lightbox from "./Lightbox";
import PlacesMap from "./PlacesMap";
import PresetCatalog, { PresetDetail, PresetList } from "./PresetCatalog";
import ExploreChallenges, {
  ExploreChallengesTrigger,
  ExplorationToast,
  type ExplorationToastMoment,
} from "./ExploreChallenges";
import { useExplorationProgress } from "./useExplorationProgress";
import type { ExplorationEvent } from "@/lib/exploration-progress";
import PresetCartPanel from "./PresetCartPanel";
import PresetLibraryPanel from "./PresetLibraryPanel";
import MenuPanel from "./MenuPanel";
import ContactPanel from "./ContactPanel";
import SavedPanel from "./SavedPanel";
import { useFavorites } from "./useFavorites";
import { nodeForPhoto, placeNode, type FavoriteKind } from "@/lib/favorites";
import { usePresetCart } from "./PresetCartProvider";
import { usePresetCommerceBoundary } from "./CommerceCartProvider";
import { AccountControl } from "./AccountControl";
import { ButtonGroup } from "./ui/button-group";
import {
  createPresetCatalogState,
  filterPresetCatalog,
  getCatalogPreset,
  type PresetCatalogState,
} from "@/lib/preset-commerce";
import {
  BULK_DISCOUNT_MINIMUM,
  BULK_DISCOUNT_PERCENT,
} from "@/lib/preset-cart";

type DrawerView =
  | "photos"
  | "presets"
  | "saved"
  | "cart"
  | "library"
  | "challenges"
  | "preset"
  | "menu"
  | "contact";
const placeHeroes = (photos: readonly { src: string }[]) =>
  heroCount(
    photos.length,
    photos.filter((photo) => heroSrcs.has(photo.src)).length,
  );
// A place opens on its heroes, so a challenge photograph among them is found without the viewer.
function explorePlace(
  node: MapNode,
  record: (event: ExplorationEvent) => unknown,
) {
  if (node.kind !== "location") return;
  if (node.precision === "regional")
    record({ type: "location-opened", locationId: node.id });
  for (const photo of node.photos.slice(0, placeHeroes(node.photos)))
    record({ type: "photo-opened", photoSrc: photo.src });
}
type PhotoMark = "remove" | "hero";
// Pages nest above an open photo drawer; otherwise a page is the drawer.
type PageView = Exclude<DrawerView, "photos">;
const pageBackLabels: Record<DrawerView, string> = {
  photos: "Back to photographs",
  presets: "All presets",
  saved: "Saved",
  cart: "Cart",
  library: "Your presets",
  challenges: "Challenges",
  preset: "Preset",
  menu: "Menu",
  contact: "Contact",
};
// Escape in a filled search box clears it (PresetCatalog) before closing a drawer.
const clearsSearch = ({ target }: KeyboardEvent) =>
  target instanceof HTMLInputElement &&
  target.type === "search" &&
  target.value !== "";

function stepTo<T>(stack: T[], view: T) {
  const index = stack.indexOf(view);
  return index < 0 ? [...stack, view] : stack.slice(0, index + 1);
}

const MotionButton = motion.create(Button);
const separatorStyle: CSSProperties = {
  height: 20,
  width: 1,
  alignSelf: "center",
  flex: "0 0 1px",
};

// Desktop gets a full-height side drawer; phones keep the bottom sheet.
const desktopQuery = "(min-width: 701px)";
function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const isDesktop = () => window.matchMedia(desktopQuery).matches;

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
  contactEmailEnabled = false,
  curating = false,
}: {
  initialLocationId?: string | null;
  initialCatalogState?: PresetCatalogState;
  initialView?: "catalog" | "cart" | "library";
  contactEmailEnabled?: boolean;
  /** Preview only: mark photos for removal or as heroes (src/app/api/curate). */
  curating?: boolean;
}) {
  const initialNode = useMemo(
    () => getMapNode(initialLocationId ?? null, travelPlaces),
    [initialLocationId],
  );
  const reducedMotion = useReducedMotion();
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    isDesktop,
    () => false,
  );
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
  // Without a place, the map opens at Continent, below the breakout, so countries stay whole.
  const [zoom, setZoom] = useState(initialNode ? 3.5 : 2);
  const liveZoom = useMotionValue(0);
  const [intro, setIntro] = useState(!initialNode && !initialView);
  const [revision, setRevision] = useState(0);
  const [zoomRevision, setZoomRevision] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [open, setOpen] = useState(Boolean(initialNode || initialView));
  const [photoFocusOpen, setPhotoFocusOpen] = useState(Boolean(initialNode));
  const { progress: explorationProgress, record: recordExploration } =
    useExplorationProgress();
  const { favorites, toggle } = useFavorites();
  function toggleFavorite(kind: FavoriteKind, id: string) {
    if (!favorites[kind].includes(id)) explore({ type: "favorite-saved", id });
    toggle(kind, id);
  }
  const [toast, setToast] = useState<ExplorationToastMoment | null>(null);
  const toastKey = useRef(0);
  const dismissToast = useCallback(() => setToast(null), []);
  function explore(event: ExplorationEvent) {
    const moment = recordExploration(event);
    if (moment) setToast({ ...moment, key: ++toastKey.current });
  }
  useEffect(() => {
    if (!initialView && initialNode)
      explorePlace(initialNode, recordExploration);
  }, [initialNode, initialView, recordExploration]);
  const [catalogState, setCatalogState] = useState(() =>
    createPresetCatalogState({ ...initialCatalogState, query: "" }),
  );
  const [initialPages] = useState<PageView[]>(() =>
    initialView === "cart" || initialView === "library"
      ? [initialView]
      : initialView === "catalog"
        ? getCatalogPreset(catalogState.selectedPresetId)
          ? ["presets", "preset"]
          : ["presets"]
        : [],
  );
  const [baseStack, setBaseStack] = useState<DrawerView[]>(
    initialNode || !initialPages.length ? ["photos"] : initialPages,
  );
  const [nestedStack, setNestedStack] = useState<PageView[]>(
    initialNode ? initialPages : [],
  );
  const drawerMode = baseStack.at(-1) ?? "photos";
  const nested = nestedStack.at(-1) ?? null;
  const topView = nested ?? (open ? drawerMode : null);
  const selectedPreset = getCatalogPreset(catalogState.selectedPresetId);
  const { checkout, reward } = usePresetCommerceBoundary();
  const { cartIds, ownedPresetIds, addPresets, removePreset } = usePresetCart();
  // Below the bulk discount, each add shows the progress toward it.
  function addToCart(ids: readonly string[]) {
    const before = cartIds.length;
    const after = new Set([
      ...cartIds,
      ...ids.filter((id) => !ownedPresetIds.includes(id)),
    ]).size;
    addPresets(ids);
    if (after === before || before >= BULK_DISCOUNT_MINIMUM) return;
    const count = Math.min(after, BULK_DISCOUNT_MINIMUM);
    setToast({
      kind: "discount",
      label:
        count === BULK_DISCOUNT_MINIMUM
          ? `${BULK_DISCOUNT_PERCENT}% off earned`
          : `Add ${BULK_DISCOUNT_MINIMUM} presets to get ${BULK_DISCOUNT_PERCENT}% off`,
      count,
      goal: BULK_DISCOUNT_MINIMUM,
      key: ++toastKey.current,
    });
  }
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
  const [chosenSnap, setSnap] = useState<number | string | null>(
    initialView ? 0.75 : 0.25,
  );
  // A phone's nested sheet opens at 75%; the drawer under it lifts to 75% so it shows receding above.
  const snap = nested && !desktop && chosenSnap === 0.25 ? 0.75 : chosenSnap;
  const [nestedSnap, setNestedSnap] = useState<number | string | null>(0.75);
  const [command, setCommand] = useState(false);
  const [query, setQuery] = useState("");
  // The command bar names the place it stepped to until the visitor moves the map.
  const [stepped, setStepped] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<PhotoMark, string[]>>({
    remove: [],
    hero: [],
  });
  useEffect(() => {
    if (!curating) return;
    fetch("/api/curate")
      .then((response) => response.ok && response.json())
      .then((marks) => marks && setMarks(marks));
  }, [curating]);
  function toggleMark(mark: PhotoMark, src: string) {
    const on = !marks[mark].includes(src);
    const previous = marks;
    setMarks({
      ...marks,
      [mark]: on
        ? [...marks[mark], src]
        : marks[mark].filter((entry) => entry !== src),
    });
    fetch("/api/curate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ src, mark, on }),
    }).then(
      (response) => response.ok || setMarks(previous),
      () => setMarks(previous),
    );
  }
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
  const nestedOrigin = useRef<HTMLElement | null>(null);
  const photoOrigin = useRef<HTMLElement | SVGElement | null>(null);
  const drawerHandle = useRef<HTMLButtonElement>(null);
  const photoFocus = useRef<HTMLButtonElement | null>(null);
  const presetsTrigger = useRef<HTMLButtonElement | null>(null);
  const cartTrigger = useRef<HTMLButtonElement | null>(null);
  const challengesTrigger = useRef<HTMLButtonElement | null>(null);
  const savedTrigger = useRef<HTMLButtonElement | null>(null);
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
    closeNested();
    setOpen(false);
  }
  function clearPresetSelection() {
    if (catalogState.selectedPresetId)
      setCatalogState((state) => ({ ...state, selectedPresetId: null }));
  }
  function closeNested() {
    setNestedStack([]);
    setNestedSnap(0.75);
    clearPresetSelection();
  }
  function openPage(view: PageView, trigger?: HTMLElement | null) {
    if (topView !== view) selectionFeedback();
    setViewer(null);
    if (open && drawerMode === "photos") {
      if (!nested) nestedOrigin.current = trigger ?? null;
      setNestedStack((stack) => stepTo(stack, view));
      return;
    }
    setBaseStack((stack) => (open ? stepTo(stack, view) : [view]));
    if (open) return;
    drawerOrigin.current = trigger ?? presetsTrigger.current;
    setSnap(0.75);
    setOpen(true);
    requestAnimationFrame(() =>
      (drawerHandle.current ?? drawerElement)?.focus({ preventScroll: true }),
    );
  }
  function back() {
    if ((nested ?? drawerMode) === "preset") clearPresetSelection();
    if (nested) setNestedStack((stack) => stack.slice(0, -1));
    else if (baseStack.length > 1) setBaseStack((stack) => stack.slice(0, -1));
    else closeDrawer();
  }
  function showPhotos() {
    selectionFeedback();
    const node = getMapNode(selectedNodeId, filteredPlaces);
    if (node) explorePlace(node, explore);
    pendingPhotoScroll.current = photoScroll.current;
    drawerOrigin.current = photoOrigin.current ?? presetsTrigger.current;
    closeNested();
    setBaseStack(["photos"]);
    setSnap(photoSnap.current);
    setOpen(true);
    requestAnimationFrame(() => {
      gallery.current?.scrollTo(0, photoScroll.current);
      (drawerHandle.current ?? drawerElement)?.focus({ preventScroll: true });
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
  // A country (or a bare collection) lists its places to dive into; a place shows its photos.
  const placeList = useMemo(
    () =>
      selected === null || selectedNodeId?.startsWith("location:")
        ? null
        : getMapNodes(filteredPlaces, "location").filter((node) =>
            selectedNodeId
              ? node.countryId === selectedNodeId
              : node.collectionId === selected,
          ),
    [filteredPlaces, selected, selectedNodeId],
  );
  // A place leads back to its country's list of places.
  const parentNode = selectedNodeId?.startsWith("location:")
    ? getMapNode(
        getMapNode(selectedNodeId, filteredPlaces)?.countryId ?? null,
        filteredPlaces,
      )
    : null;
  const heroes = place ? placeHeroes(place.photos) : 0;
  const placeId =
    selectedNodeId ??
    getMapNodes(filteredPlaces, "country").find(
      (node) => node.collectionId === selected,
    )?.id ??
    null;
  const placeSaved = placeId !== null && favorites.placeIds.includes(placeId);
  // A place shows three presets under its heroes until all are asked for.
  const [allPresetsPlace, setAllPresetsPlace] = useState<string | null>(null);
  const allPlacePresets = placeId !== null && allPresetsPlace === placeId;
  const placePresets = useMemo(() => {
    const node = selectedNodeId?.startsWith("location:")
      ? getMapNode(selectedNodeId, filteredPlaces)
      : null;
    return node ? getPlacePresets(node) : [];
  }, [filteredPlaces, selectedNodeId]);
  const placePresetProps = {
    cartIds: new Set(cartIds),
    ownedIds: new Set(ownedPresetIds),
    onAddPreset: (id: string) => addToCart([id]),
    onRemovePreset: removePreset,
    onOpenPreset: (id: string, trigger: HTMLElement) => {
      setCatalogState((state) => ({ ...state, selectedPresetId: id }));
      openPage("preset", trigger);
    },
  };
  const savedCount = favorites.placeIds.length + favorites.photoSrcs.length;
  const searchNodes = useMemo(
    () => [
      ...getMapNodes(filteredPlaces, "country"),
      ...getMapNodes(filteredPlaces, "location"),
    ],
    [filteredPlaces],
  );
  const results = useMemo(
    () => searchExplorer(filteredPlaces, query),
    [filteredPlaces, query],
  );
  function closeSearch() {
    setCommand(false);
    setQuery("");
  }
  const locationCount = searchNodes.filter(
    (node) => node.kind === "location",
  ).length;
  const viewerIndex =
    place?.photos.findIndex((photo) => photo.src === viewer) ?? -1;
  const expanded = desktop || Number(snap) >= 0.75;
  // Every step opens the new place's photos at the strip, like a marker tap.
  function navigate(direction: "back" | "next" | "shuffle") {
    if (direction === "shuffle") {
      const id = shufflePlace(filteredPlaces, selected);
      if (id === null) return;
      choose(id, true);
    } else {
      const node = stepLocation(
        filteredPlaces,
        selectedNodeId ?? selected,
        direction,
      );
      if (!node) return;
      chooseNode(node);
    }
    setStepped(true);
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
    const figures = Array.from(
      layout.querySelectorAll<HTMLElement>(":scope > figure"),
    );
    const presetSection = layout.querySelector<HTMLElement>(".place-presets");
    const images = figures.map((figure) =>
      figure.querySelector<HTMLElement>(".gallery-photo")!,
    );
    const captions = figures.map((figure) =>
      figure.querySelector("figcaption"),
    );
    const aspects = (placeList?.map((node) => node.cover) ?? place.photos).map(
      (photo) => photo.width / photo.height,
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
      const presetsHeight = presetSection?.offsetHeight ?? 0;
      const signature = `${height.toFixed(2)}:${bounds.width}:${bounds.height}:${presetsHeight}`;
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
        const width = galleryBounds.width - 32;
        const count = figures.length;
        const stripCount = Math.min(count, 4);
        const compactWidth = (width - 8 * (stripCount - 1)) / stripCount;
        const headerHeight = galleryBounds.top - bounds.top;
        const safeArea =
          parseFloat(getComputedStyle(viewport!).paddingBottom) || 0;
        const compactImageHeight = Math.max(
          64,
          compactHeight - headerHeight - safeArea - 12,
        );
        const captionHeight = placeList ? 46 : 0;
        const tiles = galleryLayout(
          aspects,
          width,
          placeList
            ? { columns: 2, caption: captionHeight }
            : { heroes, after: presetSection ? presetsHeight + 8 : 0 },
        );
        let contentHeight = 0;
        figures.forEach((figure, index) => {
          const tile = tiles[index];
          const inStrip = index < stripCount;
          const imageHeight = mix(compactImageHeight, tile.height, growth);
          const x = mix(
            Math.min(index, stripCount - 1) * (compactWidth + 8),
            tile.x,
            growth,
          );
          const y = tile.y * growth;
          figure.style.width = `${mix(compactWidth, tile.width, growth)}px`;
          figure.style.transform = `translate(${x}px, ${y}px)`;
          figure.style.opacity = inStrip ? "" : String(growth);
          figure.style.visibility = inStrip || growth > 0 ? "" : "hidden";
          images[index].style.height = `${imageHeight}px`;
          if (captions[index]) captions[index].style.opacity = String(growth);
          contentHeight = Math.max(
            contentHeight,
            y + imageHeight + captionHeight * growth,
          );
        });
        if (presetSection) {
          // Under the heroes, revealed with the grid like the captions.
          const hero = tiles[Math.min(heroes, count) - 1];
          const y = (hero.y + hero.height + 8) * growth;
          presetSection.style.transform = `translateY(${y}px)`;
          presetSection.style.opacity = String(growth);
          presetSection.style.visibility = growth > 0 ? "" : "hidden";
          contentHeight = Math.max(
            contentHeight,
            y + presetSection.offsetHeight * growth,
          );
        }
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
    // Show all rolls the rest out; the grid under the presets follows each frame.
    if (presetSection) resize.observe(presetSection);
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
  }, [
    drawerElement,
    compactFraction,
    place,
    placeList,
    heroes,
    drawerMode,
    placePresets,
  ]);
  function finishIntro() {
    setIntro(false);
    setMode("map");
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {}
  }
  /** `under` keeps pages beneath the place, so Back returns to them. */
  function choose(id: string, showPhotos = false, under: PageView[] = []) {
    selectionFeedback();
    setStepped(false);
    gallery.current?.scrollTo(0, 0);
    photoScroll.current = 0;
    pendingPhotoScroll.current = null;
    setBaseStack([...under, "photos"]);
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
      // Over a page the drawer stays tall so its back link shows.
      photoSnap.current = under.length ? 0.75 : 0.25;
      setSnap(photoSnap.current);
      setOpen(true);
      gallery.current?.scrollTo(0, 0);
    }
    try {
      sessionStorage.setItem("photo-map-intro", "seen");
    } catch {}
  }
  // Showing a place's photos closes any nested page stacked over them.
  function chooseNode(node: MapNode, under: PageView[] = []) {
    if (under.length) setNestedStack([]);
    else closeNested();
    explorePlace(node, explore);
    choose(node.collectionId, true, under);
    setSelectedNodeId(node.id);
    setMode("map");
    setZoom((current) => Math.max(current, 3.5));
  }
  // A pick made inside an expanded drawer keeps it at 75% instead of dropping to the strip.
  function chooseFromDrawer(node: MapNode) {
    const keepOpen = !desktop && expanded;
    chooseNode(node);
    if (keepOpen) {
      photoSnap.current = 0.75;
      setSnap(0.75);
    }
  }
  // Pages open a place stacked on them, so Back returns to the page.
  function showLocation(locationId: string) {
    const node = placeNode(locationId);
    if (node)
      chooseNode(node, nested ? nestedStack : (baseStack as PageView[]));
  }
  // Steps through the catalog as filtered when the preset was opened from it.
  function presetSiblings(id: string) {
    const list = filterPresetCatalog(catalogState);
    const index = list.findIndex((preset) => preset.id === id);
    return {
      previous: list[index - 1],
      next: index < 0 ? undefined : list[index + 1],
      onStep: (presetId: string) =>
        setCatalogState((state) => ({ ...state, selectedPresetId: presetId })),
    };
  }
  // Saved and preset pages open a photo in its place, stacked on the page so Back returns to it.
  function openPhotoFromPage(src: string, trigger: HTMLButtonElement) {
    const node = nodeForPhoto(src);
    if (!node) return;
    photoFocus.current = trigger;
    chooseNode(node, nested ? nestedStack : (baseStack as PageView[]));
    openPhotograph(src);
  }
  function openPhotograph(photoSrc: string | null) {
    setViewer(photoSrc);
    if (photoSrc !== null) {
      selectionFeedback();
      explore({ type: "photo-opened", photoSrc });
    }
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
        setQuery("");
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", listener);
    };
  }, []);
  // Left and Right step places like the command bar, unless a field, slider, the map canvas or the viewer already took the key.
  useEffect(() => {
    const onArrowKey = (event: KeyboardEvent) => {
      if (
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight") ||
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey ||
        command ||
        viewer !== null ||
        navigationDisabled ||
        (event.target instanceof Element &&
          event.target.closest(
            "input, textarea, select, [contenteditable], [role=slider], [role=tablist], [role=radiogroup], [role=menu], [role=listbox], .maplibregl-canvas",
          ))
      )
        return;
      event.preventDefault();
      navigate(event.key === "ArrowLeft" ? "back" : "next");
    };
    window.addEventListener("keydown", onArrowKey);
    return () => window.removeEventListener("keydown", onArrowKey);
  });
  // Phones carry search in the command bar; desktop keeps it top left.
  const search = (
    <Control
      variant={desktop ? undefined : "quiet"}
      label="Search"
      onClick={() => setCommand(true)}
    >
      <Search size={18} />
    </Control>
  );
  const zoomControl = (
    <MapZoom
      vertical={desktop}
      mode={mode}
      zoom={zoom}
      live={liveZoom}
      onChange={(nextMode, nextZoom) => {
        setZoomRevision((value) => value + 1);
        setIntro(false);
        setMode(nextMode);
        setZoom(nextZoom);
      }}
    />
  );
  function pageTitle(view: DrawerView) {
    return view === "preset"
      ? (selectedPreset?.name ?? "Preset")
      : view === "saved"
        ? "Saved places and photographs"
        : view === "cart"
          ? "Your preset cart"
          : view === "library"
            ? "Your presets"
            : view === "challenges"
              ? "Exploration challenges"
              : view === "menu"
                ? "Menu"
                : view === "contact"
                  ? "Contact"
                  : "All presets";
  }
  // Pages nest only above photos, so at most one layer shows a page.
  const pageView = nested ?? (drawerMode === "photos" ? null : drawerMode);
  const pageStack: DrawerView[] = nested ? nestedStack : baseStack;
  const page = pageView && renderPage(pageView);
  function renderPage(view: PageView) {
    // On phones the photo drawer stays visible above the sheet, so the sheet closes instead of going back.
    const previous = pageStack.at(-2) ?? (nested && desktop ? "photos" : null);
    // A lone page has the close button instead of a back button.
    const onBack = previous ? back : undefined;
    const backLabel =
      previous === "photos" && place
        ? place.name
        : previous
          ? pageBackLabels[previous]
          : undefined;
    if (view === "presets")
      return (
        <PresetCatalog
          state={catalogState}
          onStateChange={setCatalogState}
          cartIds={cartIds}
          ownedPresetIds={ownedPresetIds}
          onAddPreset={(id) => addToCart([id])}
          onAddCollection={addToCart}
          onRemovePreset={removePreset}
          scrollMemory={catalogScrollMemory}
          onBack={onBack}
          backLabel={backLabel}
          onOpenPreset={(id, trigger) => {
            setCatalogState((state) => ({ ...state, selectedPresetId: id }));
            openPage("preset", trigger);
          }}
        />
      );
    if (view === "saved")
      return (
        <SavedPanel
          favorites={favorites}
          backLabel={backLabel}
          onBack={onBack}
          onToggle={toggleFavorite}
          onOpenPlace={chooseNode}
          onOpenPhoto={openPhotoFromPage}
        />
      );
    if (view === "cart")
      return (
        <PresetCartPanel
          backLabel={backLabel}
          onBack={onBack}
          onBrowse={() => openPage("presets")}
          returnPath={`/?${checkoutParams}`}
          checkout={checkout}
        />
      );
    if (view === "library")
      return (
        <PresetLibraryPanel
          backLabel={backLabel}
          onBack={onBack}
          onBrowse={() => openPage("presets")}
        />
      );
    if (view === "menu")
      return (
        <MenuPanel
          theme={theme}
          onPresets={(trigger) => openPage("presets", trigger)}
          onTheme={changeTheme}
          onContact={(trigger) => openPage("contact", trigger)}
        />
      );
    if (view === "contact")
      return (
        <ContactPanel
          emailEnabled={contactEmailEnabled}
          backLabel={backLabel}
          onBack={onBack}
        />
      );
    if (view === "challenges")
      return (
        <ExploreChallenges
          progress={explorationProgress}
          backLabel={backLabel}
          onBack={onBack}
          claimBoundary={reward}
          onOpenPreset={(id) => {
            setCatalogState((state) => ({ ...state, selectedPresetId: id }));
            openPage("preset");
          }}
        />
      );
    return (
      selectedPreset && (
        <PresetDetail
          standalone
          preset={selectedPreset}
          inCart={cartIds.includes(selectedPreset.id)}
          owned={ownedPresetIds.includes(selectedPreset.id)}
          onAddPreset={(id) => addToCart([id])}
          onRemovePreset={removePreset}
          onSelectLocation={showLocation}
          onOpenPhoto={openPhotoFromPage}
          backLabel={backLabel ?? pageBackLabels.presets}
          onBack={back}
          siblings={
            previous === "presets"
              ? presetSiblings(selectedPreset.id)
              : undefined
          }
        />
      )
    );
  }
  // A place's actions: pinned to the drawer foot on desktop, after the last photo on phones.
  const photosBack = drawerMode === "photos" ? baseStack.at(-2) : undefined;
  const placeActions = parentNode && (
    <Button
      variant="outline"
      className="drawer-up"
      onClick={() => chooseFromDrawer(parentNode)}
    >
      View {parentNode.label}
    </Button>
  );
  return (
    <TooltipProvider delay={500}>
      <h1 className="sr-only">Photographs on the map</h1>
      <div className="explorer-top" data-drawer-open={open}>
        <ButtonGroup aria-label="Your exploration">
          <ExploreChallengesTrigger
            progress={explorationProgress}
            expanded={topView === "challenges"}
            triggerRef={challengesTrigger}
            onClick={() => openPage("challenges", challengesTrigger.current)}
          />
          <Button
            ref={savedTrigger}
            variant="control"
            className="explorer-count-trigger"
            aria-label={`Open saved, ${savedCount} saved`}
            aria-expanded={topView === "saved"}
            onClick={(event) => openPage("saved", event.currentTarget)}
          >
            <Heart size={18} aria-hidden="true" />
            {savedCount > 0 && <span aria-hidden="true">{savedCount}</span>}
          </Button>
          <Button
            ref={cartTrigger}
            variant="control"
            className="explorer-count-trigger"
            aria-label={`Open cart, ${cartIds.length} ${cartIds.length === 1 ? "preset" : "presets"}`}
            aria-expanded={topView === "cart"}
            onClick={(event) => openPage("cart", event.currentTarget)}
          >
            <ShoppingBag size={18} aria-hidden="true" />
            {cartIds.length > 0 && (
              <span aria-hidden="true">{cartIds.length}</span>
            )}
          </Button>
          {ownedPresetIds.length > 0 && (
            <Button
              variant="control"
              aria-label={`Your presets, ${ownedPresetIds.length} owned`}
              aria-expanded={topView === "library"}
              onClick={(event) => openPage("library", event.currentTarget)}
            >
              <Download size={18} aria-hidden="true" />
            </Button>
          )}
          <AccountControl className="explorer-account-trigger" />
        </ButtonGroup>
      </div>
      <div className="explorer-workspace">
        <div className="map-workspace">
          <div className="map-toolbar">
            {desktop && search}
            <Button
              ref={presetsTrigger}
              variant="control"
              className="explorer-presets-trigger"
              aria-expanded={desktop ? undefined : topView === "menu"}
              onClick={(event) =>
                openPage(desktop ? "presets" : "menu", event.currentTarget)
              }
            >
              <span className="max-[700px]:hidden">All presets</span>
              <span className="min-[701px]:hidden">
                <MenuIcon size={18} aria-hidden="true" />
                <span className="sr-only">Menu</span>
              </span>
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
            onZoomFrame={(position) => liveZoom.set(position)}
            onGesture={() => setStepped(false)}
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
        data-drawer-snap={open ? (desktop ? "side" : snap) : 0}
        inert={open && expanded && !desktop}
        style={
          {
            "--drawer-compact-height": `${compactFraction * 100}dvh`,
          } as CSSProperties
        }
      >
        {/* Phones reach theme and contact through the Menu page. */}
        <ButtonGroup
          orientation="vertical"
          className="explorer-utilities max-[700px]:hidden"
        >
          <Control
            label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            onClick={changeTheme}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Control>
          <Control label="Contact" onClick={() => openPage("contact")}>
            <Mail size={18} />
          </Control>
        </ButtonGroup>
        <div className="explorer-command-bar" aria-label="Location navigation">
          {/* Names the place Previous, Next and Shuffle landed on; at globe scale the marker alone is hard to find.
              Desktop only: on phones a step opens the 25% drawer, which carries the name. */}
          {desktop && stepped && place && (
            <p className="command-place" aria-live="polite">
              {place.name}
            </p>
          )}
          <div className="travel-commands">
            <Control
              variant="quiet"
              label="Previous"
              disabled={navigationDisabled}
              onClick={() => navigate("back")}
            >
              <ArrowLeft size={18} />
            </Control>
            <Control
              variant="quiet"
              label="Next"
              disabled={navigationDisabled}
              onClick={() => navigate("next")}
            >
              <ArrowRight size={18} />
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
            {!desktop && (
              <>
                <Separator orientation="vertical" style={separatorStyle} />
                {zoomControl}
                <Separator orientation="vertical" style={separatorStyle} />
                {search}
              </>
            )}
          </div>
        </div>
      </div>
      {desktop && <div className="map-zoom-rail">{zoomControl}</div>}
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (viewer === null) {
            if (next) setOpen(true);
            else closeDrawer();
          }
        }}
        modal={false}
        direction={desktop ? "right" : "bottom"}
        {...(!desktop && {
          snapPoints:
            drawerMode === "photos" ? [compactFraction, 0.75, 1] : [0.75, 1],
          activeSnapPoint: snap === 0.25 ? compactFraction : snap,
          setActiveSnapPoint: (value: number | string | null) =>
            changeSnap(value === compactFraction ? 0.25 : value),
        })}
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
          data-nested-open={nested !== null}
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
            // Desktop has no grip; the panel takes focus so the close
            // button does not open with a focus ring.
            (drawerHandle.current ?? drawerElement)?.focus({
              preventScroll: true,
            });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const origin = drawerOrigin.current;
            if (origin?.isConnected) origin.focus({ preventScroll: true });
            else
              document
                .querySelector<HTMLButtonElement>('button[aria-label="Search"]')
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
              document.querySelector(".map-zoom-popover[data-open]") ||
              clearsSearch(event)
            )
              event.preventDefault();
          }}
        >
          <div
            ref={drawerViewport}
            className="drawer-visible-content"
            style={{
              height: desktop
                ? "100%"
                : `${(snap === 0.25 ? compactFraction : Number(snap)) * 100}dvh`,
            }}
          >
            {!desktop && (
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
                aria-label={`Resize ${drawerMode === "photos" ? "photo" : drawerMode === "presets" ? "preset" : drawerMode} drawer, ${Number(snap) * 100} percent open`}
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
            )}
            {drawerMode === "photos" ? (
              <>
                <div className="photo-drawer-header">
                  <div>
                    {photosBack && (
                      <Button
                        variant="quiet"
                        className="photo-drawer-back"
                        onClick={back}
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        {photosBack === "preset"
                          ? (selectedPreset?.name ?? pageBackLabels.preset)
                          : pageBackLabels[photosBack]}
                      </Button>
                    )}
                    <DrawerTitle>{place?.name ?? "Photographs"}</DrawerTitle>
                    <DrawerDescription id="location-photo-description">
                      {placeList &&
                        `${placeList.length} ${placeList.length === 1 ? "place" : "places"} · `}
                      {place?.photos.length ?? 0}{" "}
                      {(place?.photos.length ?? 0) === 1
                        ? "photograph"
                        : "photographs"}
                    </DrawerDescription>
                  </div>
                  <Button
                    variant="quiet"
                    className="drawer-presets-link"
                    onClick={(event) =>
                      openPage("presets", event.currentTarget)
                    }
                  >
                    Presets
                  </Button>
                  {placeId && (
                    <Button
                      variant="quiet"
                      className="drawer-save"
                      aria-label={`Save ${place?.name ?? "place"}`}
                      aria-pressed={placeSaved}
                      onClick={() => toggleFavorite("placeIds", placeId)}
                    >
                      <Heart
                        size={18}
                        fill={placeSaved ? "currentColor" : "none"}
                        className={placeSaved ? "text-favorite" : undefined}
                        aria-hidden="true"
                      />
                    </Button>
                  )}
                  <Button
                    variant="quiet"
                    aria-label="Close photographs"
                    onClick={closeDrawer}
                  >
                    <X size={18} />
                  </Button>
                </div>
              </>
            ) : (
              <div className="drawer-commerce-header">
                <DrawerTitle className="sr-only">
                  {pageTitle(drawerMode)}
                </DrawerTitle>
                <DrawerDescription
                  id="drawer-panel-description"
                  className="sr-only"
                >
                  {pageTitle(drawerMode)}.
                </DrawerDescription>
                {/* One back link per page: a page deeper in the stack has its own, and menu pages
                    always do. Desktop only: on phones, swiping the sheet down already leaves the page. */}
                {desktop &&
                  place &&
                  baseStack.length === 1 &&
                  drawerMode !== "menu" && (
                    <Button
                      variant="quiet"
                      className="drawer-back"
                      onClick={showPhotos}
                    >
                      <ArrowLeft size={16} aria-hidden="true" />
                      {place.name}
                    </Button>
                  )}
                <Button
                  variant="quiet"
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
                {placeList
                  ? placeList.map((node) => (
                      <figure key={node.id}>
                        <MotionButton
                          variant="quiet"
                          press={false}
                          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 28,
                          }}
                          className="gallery-photo"
                          aria-label={`${node.label}, ${node.photoCount} ${node.photoCount === 1 ? "photograph" : "photographs"}`}
                          onClick={(event) => {
                            if (event.detail > 0 && dragged.current) return;
                            gallery.current?.scrollTo(0, 0);
                            chooseFromDrawer(node);
                          }}
                        >
                          <PhotoImage
                            photo={node.cover}
                            skeleton
                            sizes="(max-width: 700px) calc(50vw - 20px), 175px"
                          />
                        </MotionButton>
                        <figcaption>
                          <span>{node.label}</span>
                          <span>
                            {node.photoCount}{" "}
                            {node.photoCount === 1
                              ? "photograph"
                              : "photographs"}
                          </span>
                        </figcaption>
                      </figure>
                    ))
                  : place?.photos.map((photo, index) => (
                      <figure
                        key={photo.src}
                        data-removal={
                          marks.remove.includes(photo.src) || undefined
                        }
                      >
                        <MotionButton
                          variant="quiet"
                          press={false}
                          whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 28,
                          }}
                          className="gallery-photo"
                          aria-label={`View ${photo.title || place.name}${photo.taken ? `, ${takenLabel(photo.taken)}` : ""}`}
                          onClick={(event) => {
                            if (event.detail > 0 && dragged.current) return;
                            // In the compact strip a tap expands the drawer; the photo opens from there.
                            if (!expanded) return changeSnap(0.75);
                            photoFocus.current = event.currentTarget;
                            openPhotograph(photo.src);
                          }}
                        >
                          <PhotoImage
                            photo={photo}
                            skeleton
                            sizes={
                              // A grid landscape spans two cells, or the row when alone.
                              (index === 0 && heroes !== 2) ||
                              (index >= heroes && photo.width > photo.height)
                                ? "(max-width: 700px) calc(100vw - 32px), 358px"
                                : index < heroes
                                  ? "(max-width: 700px) calc(50vw - 20px), 175px"
                                  : "(max-width: 700px) calc(33vw - 16px), 114px"
                            }
                          />
                          {curating && (
                            <span className="gallery-marks">
                              {marks.hero.includes(photo.src) && (
                                <Star
                                  size={16}
                                  fill="currentColor"
                                  aria-label="Marked as hero"
                                />
                              )}
                              {marks.remove.includes(photo.src) && (
                                <Trash2
                                  size={16}
                                  aria-label="Marked for removal"
                                />
                              )}
                            </span>
                          )}
                        </MotionButton>
                      </figure>
                    ))}
                {!placeList && placePresets.length > 0 && (
                  <section
                    className="place-presets"
                    aria-labelledby="place-presets-heading"
                  >
                    <h3 id="place-presets-heading">
                      Presets used at this location
                    </h3>
                    <PresetList
                      presets={placePresets.slice(0, 3)}
                      {...placePresetProps}
                    />
                    {placePresets.length > 3 && (
                      <>
                        <div
                          className="place-presets-rest"
                          data-open={allPlacePresets}
                          inert={!allPlacePresets}
                        >
                          <div>
                            <PresetList
                              presets={placePresets.slice(3)}
                              {...placePresetProps}
                            />
                          </div>
                        </div>
                        <Button
                          variant="quiet"
                          className="place-presets-more"
                          aria-expanded={allPlacePresets}
                          onClick={() =>
                            setAllPresetsPlace(allPlacePresets ? null : placeId)
                          }
                        >
                          {allPlacePresets
                            ? "Show fewer"
                            : `Show all ${placePresets.length}`}
                        </Button>
                      </>
                    )}
                    {(place?.photos.length ?? 0) > heroes && (
                      <h3>Photos from this location</h3>
                    )}
                  </section>
                )}
              </div>
              {/* Phones end a place with its way back to the country's list of places. */}
              {!desktop && expanded && placeActions}
            </div>
            {desktop && drawerMode === "photos" && placeActions && (
              <DrawerFooter className="pt-0">{placeActions}</DrawerFooter>
            )}
            {drawerMode !== "photos" && (
              <div className="drawer-commerce-pane">{page}</div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <Drawer
        open={nested !== null}
        onOpenChange={(next) => {
          if (!next) closeNested();
        }}
        modal={false}
        direction={desktop ? "right" : "bottom"}
        {...(!desktop && {
          snapPoints: [0.75, 1],
          activeSnapPoint: nestedSnap,
          setActiveSnapPoint: setNestedSnap,
        })}
        repositionInputs={false}
      >
        <DrawerContent
          className="location-drawer nested-drawer explorer-overlay"
          // The sheet is full height; the padding keeps content inside the visible snap.
          style={
            desktop
              ? undefined
              : { paddingBottom: `${(1 - Number(nestedSnap)) * 100}dvh` }
          }
          onEscapeKeyDown={(event) => {
            if (clearsSearch(event)) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // After the drawer's own autofocus when both open together.
            const content = event.currentTarget as HTMLElement;
            requestAnimationFrame(() =>
              content
                .querySelector<HTMLElement>("button")
                ?.focus({ preventScroll: true }),
            );
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const origin = nestedOrigin.current;
            (origin?.isConnected
              ? origin
              : (drawerHandle.current ?? drawerElement)
            )?.focus({
              preventScroll: true,
            });
          }}
          onScrollCapture={(event) => {
            const scroller = event.target as HTMLElement;
            if (scroller.hasAttribute("data-drawer-scroll"))
              scroller.dataset.scrolled = String(scroller.scrollTop > 0);
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
          {/* Drag-to-dismiss cue; Close and Back are the keyboard path. */}
          {!desktop && <div className="photo-drawer-grip" aria-hidden="true" />}
          {!desktop && (
            <div className="drawer-commerce-header">
              <Button variant="quiet" aria-label="Close" onClick={closeNested}>
                <X size={18} />
              </Button>
            </div>
          )}
          <DrawerTitle className="sr-only">
            {nested ? pageTitle(nested) : "Page"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {nested ? pageTitle(nested) : "Page"}.
          </DrawerDescription>
          <div className="drawer-commerce-pane">{nested && page}</div>
        </DrawerContent>
      </Drawer>
      <CommandDialog
        open={command}
        onOpenChange={(next) => (next ? setCommand(true) : closeSearch())}
        title="Search"
        description="Search places and photographs."
        className="explorer-overlay"
        finalFocus={() =>
          open ? (drawerHandle.current ?? drawerElement) : true
        }
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search places and photographs…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            {results.places.length > 0 && (
              <CommandGroup heading="Places">
                {results.places.map(({ node, collection }) => (
                  <CommandItem
                    key={node.id}
                    value={node.id}
                    className="min-h-11"
                    onSelect={() => {
                      chooseNode(node);
                      closeSearch();
                    }}
                  >
                    {node.label}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {node.kind === "country" ? "All photographs" : collection}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {results.photos.length > 0 && (
              <CommandGroup heading="Photographs">
                {results.photos.map(({ photo, node, collection }) => (
                  <CommandItem
                    key={photo.src}
                    value={photo.src}
                    onSelect={() => {
                      chooseNode(node);
                      openPhotograph(photo.src);
                      closeSearch();
                    }}
                  >
                    <Image
                      className="size-11 shrink-0 rounded-md object-cover"
                      src={photoUrl(photo.src)}
                      alt=""
                      width={44}
                      height={44}
                      sizes="44px"
                      quality={75}
                    />
                    <span className="grid min-w-0">
                      <span className="truncate">
                        {photo.title || node.label}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {[
                          node.kind === "country" || photo.title === node.label
                            ? collection
                            : node.label,
                          takenLabel(photo.taken),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
      <Lightbox
        finalFocus={photoFocus}
        action={(photo) => {
          const saved = favorites.photoSrcs.includes(photo.src);
          const hero = marks.hero.includes(photo.src);
          const removed = marks.remove.includes(photo.src);
          return (
            <>
              {curating && (
                <>
                  <Button
                    variant="quiet"
                    className="lightbox-removal"
                    aria-pressed={hero}
                    onClick={() => toggleMark("hero", photo.src)}
                  >
                    <Star
                      size={16}
                      fill={hero ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                    {/* Phones keep only the icon, so the viewer's header fits. */}
                    <span className="max-[700px]:sr-only">
                      {hero ? "Hero" : "Mark as hero"}
                    </span>
                  </Button>
                  <Button
                    variant="quiet"
                    className="lightbox-removal"
                    aria-pressed={removed}
                    onClick={() => toggleMark("remove", photo.src)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    <span className="max-[700px]:sr-only">
                      {removed ? "Marked for removal" : "Mark for removal"}
                    </span>
                  </Button>
                </>
              )}
              <Button
                variant="icon"
                aria-label={`Save ${photo.title}`}
                aria-pressed={saved}
                onClick={() => toggleFavorite("photoSrcs", photo.src)}
              >
                <Heart
                  size={22}
                  strokeWidth={1.5}
                  fill={saved ? "currentColor" : "none"}
                  className={saved ? "text-favorite" : undefined}
                />
              </Button>
            </>
          );
        }}
        photos={place?.photos ?? []}
        index={viewerIndex < 0 ? null : viewerIndex}
        onIndexChange={(index) => {
          openPhotograph(
            index === null ? null : (place?.photos[index]?.src ?? null),
          );
        }}
      />
      <ExplorationToast
        moment={toast}
        onDismiss={dismissToast}
        onOpen={() => {
          dismissToast();
          if (toast?.kind === "discount") openPage("cart", cartTrigger.current);
          else openPage("challenges", challengesTrigger.current);
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
