"use client";

import { useEffect, useId, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Plus,
} from "lucide-react";
import { nodeForPhoto } from "@/lib/favorites";
import { getPresetPlaces } from "@/lib/map-hierarchy";
import type { Photo } from "@/lib/photography";
import { travelPlaces } from "@/lib/places";
import {
  filterPresetCatalog,
  getCatalogPreset,
  presetCatalog,
  presetCategories,
  type PresetCatalogState,
  type PresetCategory,
} from "@/lib/preset-commerce";
import { Button, buttonVariants } from "./ui/button";
import { PresetDownloadButton } from "./PresetDownloadButton";
import { useCommerceAccount } from "./CommerceProviders";
import { Label } from "./ui/label";
import { NativeSelect } from "./ui/native-select";
import { Item, ItemActions, ItemContent, ItemGroup } from "./ui/item";
import PhotoComparison from "./PhotoComparison";
import PhotoImage from "./PhotoImage";
import panel from "./ExploreChallenges.module.css";
import styles from "./PresetCatalog.module.css";

export type PresetCatalogProps = {
  cartIds: readonly string[];
  onAddPreset: (id: string) => void;
  onAddCollection?: (ids: readonly string[]) => void;
  onRemovePreset?: (id: string) => void;
  /** Pass only ownership confirmed by server-side entitlements. */
  ownedPresetIds?: readonly string[];
  state: PresetCatalogState;
  onStateChange: (state: PresetCatalogState) => void;
  onSelectLocation?: (locationId: string, presetId: string) => void;
  onBack?: () => void;
  backLabel?: string;
  scrollMemory?: { get: () => number; set: (value: number) => void };
  /** Opens a preset outside the catalog instead of inline. */
  onOpenPreset?: (id: string, trigger: HTMLElement) => void;
};

export default function PresetCatalog({
  cartIds,
  onAddPreset,
  onAddCollection,
  onRemovePreset,
  ownedPresetIds = [],
  state,
  onStateChange,
  onSelectLocation,
  onBack,
  backLabel = "Back to photographs",
  scrollMemory,
  onOpenPreset,
}: PresetCatalogProps) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [keyboardInteraction, setKeyboardInteraction] = useState(false);
  const selected = onOpenPreset
    ? undefined
    : getCatalogPreset(state.selectedPresetId);
  const results = filterPresetCatalog({ ...state, query: "" });
  const cart = new Set(
    cartIds.filter((presetId) => getCatalogPreset(presetId)),
  );
  const owned = new Set(
    ownedPresetIds.filter((presetId) => getCatalogPreset(presetId)),
  );
  const remainingCollectionIds = presetCatalog
    .filter((preset) => !cart.has(preset.id) && !owned.has(preset.id))
    .map((preset) => preset.id);
  const selectedInCart = selected ? cart.has(selected.id) : false;
  const selectedOwned = selected ? owned.has(selected.id) : false;
  const localScroll = useRef(0);
  const resultsElement = useRef<HTMLDivElement>(null);
  const catalogElement = useRef<HTMLElement>(null);
  useEffect(() => {
    if (selected) {
      if (catalogElement.current) catalogElement.current.scrollTop = 0;
      return;
    }
    const container = catalogElement.current;
    if (container)
      container.scrollTop = scrollMemory?.get() ?? localScroll.current;
  }, [selected, scrollMemory]);
  const detailBack = useRef<HTMLButtonElement | null>(null);
  const categoryInput = useRef<HTMLSelectElement>(null);

  function update(next: Partial<PresetCatalogState>) {
    onStateChange({ ...state, ...next });
  }

  return (
    <section
      ref={catalogElement}
      className={styles.catalog}
      data-drawer-scroll
      onScroll={(event) => {
        if (!selected) {
          localScroll.current = event.currentTarget.scrollTop;
          scrollMemory?.set(event.currentTarget.scrollTop);
        }
      }}
      aria-labelledby={`${id}-heading`}
      onKeyDownCapture={() => setKeyboardInteraction(true)}
      onPointerDownCapture={() => setKeyboardInteraction(false)}
    >
      <header className={styles.header}>
        {onBack && (
          <Button variant="quiet" className={styles.back} onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </Button>
        )}
        <div className={styles.heading}>
          <div>
            <h2 id={`${id}-heading`}>Presets</h2>
          </div>
          <span className={styles.total}>$1.99 each · 20% off 10+</span>
        </div>
      </header>

      <div className={styles.listPane} hidden={Boolean(selected)}>
        <div className={styles.filters}>
          <Label htmlFor={`${id}-category`} className={styles.categoryLabel}>
            <span className="sr-only">Category</span>
            <NativeSelect
              ref={categoryInput}
              id={`${id}-category`}
              className={styles.category}
              value={state.category}
              onChange={(event) =>
                update({ category: event.target.value as PresetCategory })
              }
            >
              {presetCategories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All categories" : category}
                </option>
              ))}
            </NativeSelect>
          </Label>
          {onAddCollection && (
            <Button
              variant="control"
              className={styles.collectionAction}
              disabled={remainingCollectionIds.length === 0}
              onClick={() => onAddCollection(remainingCollectionIds)}
              aria-label={
                remainingCollectionIds.length === 0
                  ? "All presets selected"
                  : "Add all 21 presets to cart"
              }
            >
              {remainingCollectionIds.length === 0 ? "All selected" : "Add all"}
            </Button>
          )}
        </div>
        <p className="sr-only" role="status">
          {results.length} {results.length === 1 ? "preset" : "presets"}
          {state.category !== "All" ? " found" : " in collection"}
        </p>
        <div
          ref={resultsElement}
          className={styles.results}
          aria-label="Preset catalog"
        >
          <ItemGroup className={styles.items}>
            {results.map((preset) => {
              const inCart = cart.has(preset.id);
              const isOwned = owned.has(preset.id);
              return (
                <Item
                  key={preset.id}
                  role="listitem"
                  size="sm"
                  className={styles.item}
                >
                  <ItemContent className={styles.itemContent}>
                    <Link
                      href={`/?view=catalog&preset=${preset.id}`}
                      prefetch={false}
                      data-preset-id={preset.id}
                      className={buttonVariants({
                        variant: "quiet",
                        className: styles.preset,
                      })}
                      aria-label={`${preset.name}, ${preset.category}. View details`}
                      onClick={(event) => {
                        if (
                          event.metaKey ||
                          event.ctrlKey ||
                          event.shiftKey ||
                          event.altKey ||
                          event.button !== 0
                        )
                          return;
                        event.preventDefault();
                        if (onOpenPreset) {
                          onOpenPreset(preset.id, event.currentTarget);
                          return;
                        }
                        update({ selectedPresetId: preset.id });
                        requestAnimationFrame(() =>
                          detailBack.current?.focus(),
                        );
                      }}
                    >
                      <span className={styles.number} aria-hidden="true">
                        {String(preset.number).padStart(2, "0")}
                      </span>
                      <span className={styles.presetName}>
                        <strong>{preset.name}</strong>
                        <small>{preset.category}</small>
                      </span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  </ItemContent>
                  <ItemActions className={styles.itemActions}>
                    <span className={styles.rowPrice}>
                      <span>$1.99</span>
                      {(isOwned || inCart) && (
                        <small>{isOwned ? "Owned" : "In cart"}</small>
                      )}
                    </span>
                    <Button
                      variant="control"
                      className={styles.add}
                      data-selected={inCart || isOwned}
                      disabled={isOwned || (inCart && !onRemovePreset)}
                      aria-label={
                        isOwned
                          ? `${preset.name} is owned`
                          : inCart
                            ? onRemovePreset
                              ? `Remove ${preset.name} from cart`
                              : `${preset.name} is in cart`
                            : `Add ${preset.name} to cart`
                      }
                      onClick={() => {
                        if (isOwned) return;
                        if (inCart) onRemovePreset?.(preset.id);
                        else onAddPreset(preset.id);
                      }}
                    >
                      <span className={styles.selectionIcon} aria-hidden="true">
                        <AnimatePresence initial={false}>
                          <motion.span
                            key={isOwned || inCart ? "selected" : "add"}
                            initial={{
                              opacity: 0,
                              scale: 0.25,
                              filter: "blur(4px)",
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              filter: "blur(0px)",
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.25,
                              filter: "blur(4px)",
                            }}
                            transition={
                              reducedMotion || keyboardInteraction
                                ? { duration: 0 }
                                : { type: "spring", duration: 0.3, bounce: 0 }
                            }
                          >
                            {isOwned || inCart ? (
                              <Check size={18} />
                            ) : (
                              <Plus size={18} />
                            )}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                    </Button>
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
          {results.length === 0 && (
            <div className={styles.empty}>
              <p>No presets match these filters.</p>
              <Button
                variant="outline"
                onClick={() => {
                  update({ query: "", category: "All" });
                  requestAnimationFrame(() => categoryInput.current?.focus());
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <PresetDetail
          preset={selected}
          inCart={selectedInCart}
          owned={selectedOwned}
          onAddPreset={onAddPreset}
          onRemovePreset={onRemovePreset}
          onSelectLocation={onSelectLocation}
          backRef={detailBack}
          onBack={() => {
            update({ selectedPresetId: null });
            requestAnimationFrame(() => {
              const result = resultsElement.current?.querySelector<HTMLElement>(
                `[data-preset-id="${selected.id}"]`,
              );
              (result ?? categoryInput.current)?.focus({
                preventScroll: true,
              });
            });
          }}
        />
      )}
    </section>
  );
}

function examplePhoto(
  preset: NonNullable<ReturnType<typeof getCatalogPreset>>,
  side: "before" | "after",
): Photo {
  const { width, height, [side]: key } = preset.example!;
  return {
    src: `/preset-examples/${key}`,
    title: `${preset.name} ${side}`,
    alt: `Example photograph, ${side === "before" ? "unedited" : `edited with ${preset.name}`}`,
    width,
    height,
    collection: preset.id,
  };
}

export function PresetDetail({
  preset,
  inCart,
  owned,
  onAddPreset,
  onRemovePreset,
  onSelectLocation,
  onOpenPhoto,
  onBack,
  backLabel = "All presets",
  backRef,
  standalone = false,
}: {
  preset: NonNullable<ReturnType<typeof getCatalogPreset>>;
  inCart: boolean;
  owned: boolean;
  onAddPreset: (id: string) => void;
  onRemovePreset?: (id: string) => void;
  onSelectLocation?: (locationId: string, presetId: string) => void;
  onOpenPhoto?: (src: string, trigger: HTMLButtonElement) => void;
  onBack: () => void;
  backLabel?: string;
  backRef?: Ref<HTMLButtonElement>;
  /** Renders its own scroll container outside the catalog. */
  standalone?: boolean;
}) {
  const { anonymous } = useCommerceAccount();
  const showcase = preset.showcase.flatMap((src) => {
    const photo = nodeForPhoto(src)?.photos.find((p) => p.src === src);
    return photo ? [photo] : [];
  });
  // Every map photo edited with the preset, by place, after the showcase.
  const places = getPresetPlaces(travelPlaces, preset.id).flatMap((place) => {
    const photos = place.photos.filter(
      (photo) => !preset.showcase.includes(photo.src),
    );
    return photos.length ? [{ ...place, photos }] : [];
  });
  const example = preset.example && {
    before: examplePhoto(preset, "before"),
    after: examplePhoto(preset, "after"),
  };
  const photoGrid = (photos: Photo[], className = panel.savedPhotos) => (
    <ul className={className}>
      {photos.map((photo) => (
        <li key={photo.src}>
          <Button
            variant="quiet"
            className={panel.savedPhoto}
            aria-label={`View ${photo.title}`}
            disabled={!onOpenPhoto}
            onClick={(event) => onOpenPhoto?.(photo.src, event.currentTarget)}
          >
            <PhotoImage photo={photo} sizes="(max-width: 700px) 50vw, 200px" />
          </Button>
        </li>
      ))}
    </ul>
  );
  const detail = (
    <div className={styles.detail}>
      <Button
        ref={backRef}
        variant="quiet"
        className={styles.back}
        onClick={onBack}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        {backLabel}
      </Button>
      <div className={styles.productHeading}>
        <span className={styles.productNumber} aria-hidden="true">
          {String(preset.number).padStart(2, "0")}
        </span>
        <div>
          <p className={styles.eyebrow}>{preset.category}</p>
          <h3>{preset.name}</h3>
        </div>
      </div>
      {example && <PhotoComparison pair={example} />}
      <div className={styles.purchase}>
        <p>{owned ? "Owned" : "$1.99"}</p>
        {owned ? (
          <>
            <PresetDownloadButton
              presetId={preset.id}
              size="lg"
              className="w-full"
            />
            {anonymous && (
              <p className={styles.notice}>
                Saved in this browser only. Sign in to keep it.
              </p>
            )}
          </>
        ) : (
          <Button
            size="lg"
            variant={inCart ? "outline" : "default"}
            className="w-full"
            disabled={inCart && !onRemovePreset}
            onClick={() =>
              inCart ? onRemovePreset?.(preset.id) : onAddPreset(preset.id)
            }
          >
            {inCart ? (
              <Check aria-hidden="true" />
            ) : (
              <Plus aria-hidden="true" />
            )}
            {inCart
              ? onRemovePreset
                ? "Remove from cart"
                : "In cart"
              : "Add to cart"}
          </Button>
        )}
      </div>
      <dl className={styles.facts}>
        <dt>Best for</dt>
        <dd>{preset.bestFor}</dd>
        <dt>What it does</dt>
        <dd>{preset.whatItDoes}</dd>
        {preset.watchOut && (
          <>
            <dt>Watch out</dt>
            <dd>{preset.watchOut}</dd>
          </>
        )}
      </dl>
      {showcase.length > 0 && (
        <section className={styles.facts} aria-label="Showcase">
          {photoGrid(showcase, `${panel.savedPhotos} ${styles.showcase}`)}
        </section>
      )}
      {places.map((place) => (
        <section
          key={place.id}
          className={styles.facts}
          aria-labelledby={`${preset.id}-${place.id}`}
        >
          <h4 id={`${preset.id}-${place.id}`} className={panel.savedHeading}>
            {onSelectLocation ? (
              <Button
                variant="quiet"
                className={styles.placeLink}
                onClick={() => onSelectLocation(place.id, preset.id)}
              >
                {place.label}
                <ArrowUpRight size={14} aria-hidden="true" />
              </Button>
            ) : (
              place.label
            )}
            <span>{place.photos.length}</span>
          </h4>
          {photoGrid(place.photos)}
        </section>
      ))}
    </div>
  );
  return standalone ? (
    <section
      className={`${styles.catalog} ${styles.standalone}`}
      data-drawer-scroll
    >
      {detail}
    </section>
  ) : (
    detail
  );
}
