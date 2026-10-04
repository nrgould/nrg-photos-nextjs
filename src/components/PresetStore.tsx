"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import PresetCatalog from "./PresetCatalog";
import PresetCartPanel, {
  type PresetCheckoutBoundary,
} from "./PresetCartPanel";
import { usePresetCart } from "./PresetCartProvider";
import { usePresetCommerceBoundary } from "./CommerceCartProvider";
import { AccountControl } from "./AccountControl";
import {
  createPresetCatalogState,
  type PresetCatalogState,
} from "@/lib/preset-commerce";
import { Button, buttonVariants } from "./ui/button";
import styles from "./PresetCatalog.module.css";

export default function PresetStore({
  initialState,
  initialView = "catalog",
  checkout,
}: {
  initialState?: PresetCatalogState;
  initialView?: "catalog" | "cart";
  checkout?: PresetCheckoutBoundary;
}) {
  const [state, setState] = useState(() =>
    createPresetCatalogState(initialState),
  );
  const [view, setView] = useState(initialView);
  const commerce = usePresetCommerceBoundary();
  const { cartIds, ownedPresetIds, addPreset, addPresets, removePreset } =
    usePresetCart();
  const cartButton = useRef<HTMLButtonElement>(null);
  const cartContainer = useRef<HTMLDivElement>(null);
  const catalogScroll = useRef(0);
  const [scrollMemory] = useState(() => ({
    get: () => catalogScroll.current,
    set: (value: number) => {
      catalogScroll.current = value;
    },
  }));
  const params = new URLSearchParams({ view: "cart" });
  if (state.query) params.set("query", state.query);
  if (state.category !== "All") params.set("category", state.category);
  if (state.selectedPresetId) params.set("preset", state.selectedPresetId);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname !== "/presets") return;
    for (const key of ["query", "category", "preset", "view"])
      url.searchParams.delete(key);
    if (state.query) url.searchParams.set("query", state.query);
    if (state.category !== "All")
      url.searchParams.set("category", state.category);
    if (state.selectedPresetId)
      url.searchParams.set("preset", state.selectedPresetId);
    if (view === "cart") url.searchParams.set("view", "cart");
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (
      path !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    )
      window.history.replaceState(window.history.state, "", path);
  }, [state.query, state.category, state.selectedPresetId, view]);

  function closeCart() {
    setView("catalog");
    requestAnimationFrame(() => cartButton.current?.focus());
  }

  return (
    <div className={styles.store}>
      <nav
        className={`${styles.storeNav} flex-wrap`}
        aria-label="Preset navigation"
      >
        <Link
          href="/explore"
          className={buttonVariants({
            variant: "quiet",
            className: styles.back,
          })}
        >
          Explore the map
        </Link>
        <AccountControl />
        <Button
          ref={cartButton}
          variant="control"
          className={styles.cartTrigger}
          aria-pressed={view === "cart"}
          onClick={() => {
            if (view === "cart") closeCart();
            else {
              setView("cart");
              requestAnimationFrame(() => cartContainer.current?.focus());
            }
          }}
        >
          <ShoppingBag size={17} aria-hidden="true" /> Cart{" "}
          <span>{cartIds.length}</span>
        </Button>
      </nav>
      <div className={styles.storeContent}>
        <div className={styles.storePane} hidden={view !== "catalog"}>
          <PresetCatalog
            state={state}
            onStateChange={setState}
            cartIds={cartIds}
            ownedPresetIds={ownedPresetIds}
            onAddPreset={addPreset}
            onAddCollection={addPresets}
            onRemovePreset={removePreset}
            scrollMemory={scrollMemory}
          />
        </div>
        {view === "cart" && (
          <div
            ref={cartContainer}
            tabIndex={-1}
            className={styles.storePane}
            aria-label="Your preset cart"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeCart();
              }
            }}
          >
            <PresetCartPanel
              onBack={closeCart}
              returnPath={`/presets?${params}`}
              checkout={checkout ?? commerce.checkout}
            />
          </div>
        )}
      </div>
    </div>
  );
}
