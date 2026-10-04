"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Plus,
} from "lucide-react";
import {
  filterPresetCatalog,
  getCatalogPreset,
  getVerifiedPresetLocations,
  presetCatalog,
  presetCategories,
  type PresetCatalogState,
  type PresetCategory,
} from "@/lib/preset-commerce";
import { Button, buttonVariants } from "./ui/button";
import { PresetDownloadButton } from "./PresetDownloadButton";
import { Label } from "./ui/label";
import { NativeSelect } from "./ui/native-select";
import { Item, ItemActions, ItemContent, ItemGroup } from "./ui/item";
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
}: PresetCatalogProps) {
  const id = useId();
  const reducedMotion = useReducedMotion();
  const [keyboardInteraction, setKeyboardInteraction] = useState(false);
  const selected = getCatalogPreset(state.selectedPresetId);
  const results = filterPresetCatalog({ ...state, query: "" });
  const locations = getVerifiedPresetLocations(selected?.id);
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
                      href={`/presets/${preset.id}`}
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
                variant="control"
                className={styles.action}
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
        <div className={styles.detail}>
          <Button
            ref={detailBack}
            variant="quiet"
            className={styles.back}
            onClick={() => {
              update({ selectedPresetId: null });
              requestAnimationFrame(() => {
                const result =
                  resultsElement.current?.querySelector<HTMLElement>(
                    `[data-preset-id="${selected.id}"]`,
                  );
                (result ?? categoryInput.current)?.focus({
                  preventScroll: true,
                });
              });
            }}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            All presets
          </Button>
          <div className={styles.productHeading}>
            <span className={styles.productNumber} aria-hidden="true">
              {String(selected.number).padStart(2, "0")}
            </span>
            <div>
              <p className={styles.eyebrow}>{selected.category}</p>
              <h3>{selected.name}</h3>
            </div>
          </div>
          <div className={styles.purchase}>
            <p>$1.99</p>
            <Button
              variant="solid"
              className={styles.buy}
              disabled={selectedOwned || (selectedInCart && !onRemovePreset)}
              onClick={() => {
                if (selectedOwned) return;
                if (selectedInCart) onRemovePreset?.(selected.id);
                else onAddPreset(selected.id);
              }}
            >
              {selectedOwned
                ? "Owned"
                : selectedInCart
                  ? onRemovePreset
                    ? "Remove from cart"
                    : "In cart"
                  : "Add to cart"}
              {selectedOwned || selectedInCart ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Plus size={18} aria-hidden="true" />
              )}
            </Button>
            {selectedOwned && <PresetDownloadButton presetId={selected.id} />}
          </div>
          <div className={styles.facts}>
            <h4>About this preset</h4>
            <p>
              Compatibility, included files and license details are not
              published yet.
            </p>
            <Link
              href={`/presets/${selected.id}`}
              className={buttonVariants({
                variant: "quiet",
                className: styles.back,
              })}
            >
              Open preset page
            </Link>
          </div>
          <div className={styles.facts}>
            <h4>Photographs & locations</h4>
            {locations.length > 0 ? (
              <ul className={styles.locations}>
                {locations.map((location) => (
                  <li key={location.locationId}>
                    {onSelectLocation ? (
                      <Button
                        variant="control"
                        className={styles.action}
                        onClick={() =>
                          onSelectLocation(location.locationId, selected.id)
                        }
                      >
                        {location.locationName}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </Button>
                    ) : (
                      <span>{location.locationName}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Photo and location links are not available yet.</p>
            )}
            <p>Before-and-after previews are not available yet.</p>
          </div>
        </div>
      )}
    </section>
  );
}
