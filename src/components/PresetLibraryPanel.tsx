"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import {
  attemptPresetIds,
  checkoutAttemptStorageKey,
} from "@/lib/commerce-checkout-client";
import { getCatalogPreset } from "@/lib/preset-commerce";
import { SignInDialog } from "./AccountControl";
import { usePresetCommerceBoundary } from "./CommerceCartProvider";
import { useCommerceAccount } from "./CommerceProviders";
import { PresetDownloadButton } from "./PresetDownloadButton";
import { Button } from "./ui/button";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { Item, ItemActions, ItemContent, ItemGroup } from "./ui/item";
import styles from "./PresetCatalog.module.css";

export default function PresetLibraryPanel({
  onBack,
  onBrowse,
  backLabel = "Presets",
}: {
  onBack?: () => void;
  onBrowse: () => void;
  backLabel?: string;
}) {
  const id = useId();
  const account = useCommerceAccount();
  const { ownedPresetIds, ownershipStatus, refreshOwnership } =
    usePresetCommerceBoundary();
  // A refresh briefly clears verified ownership; keep the last verified list so rows don't flicker.
  const [owned, setOwned] = useState(ownedPresetIds);
  if (ownershipStatus === "verified" && owned !== ownedPresetIds)
    setOwned(ownedPresetIds);
  const userId = account.userId;
  // Stripe's success redirect marks the URL; the last checkout's presets may still be confirming.
  const purchased = useMemo(() => {
    if (
      !userId ||
      new URLSearchParams(window.location.search).get("checkout") !== "returned"
    )
      return [];
    try {
      return attemptPresetIds(
        JSON.parse(sessionStorage.getItem(checkoutAttemptStorageKey) ?? "null"),
        userId,
      );
    } catch {
      return [];
    }
  }, [userId]);
  const ids = userId ? [...new Set([...purchased, ...owned])] : [];
  const confirming = purchased.some((presetId) => !owned.includes(presetId));
  const [timedOut, setTimedOut] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // The webhook grants presets a moment after Stripe redirects back.
  useEffect(() => {
    if (!confirming) return;
    const poll = window.setInterval(refreshOwnership, 2000);
    const stop = window.setTimeout(() => {
      window.clearInterval(poll);
      setTimedOut(true);
    }, 30000);
    return () => {
      window.clearInterval(poll);
      window.clearTimeout(stop);
    };
  }, [confirming, refreshOwnership]);

  return (
    <section
      className={styles.cartPanel}
      data-drawer-scroll
      aria-labelledby={`${id}-heading`}
    >
      <header className={styles.header}>
        {onBack && (
          <Button variant="quiet" className={styles.back} onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
          </Button>
        )}
        <div className={styles.heading}>
          <h2 id={`${id}-heading`}>Your presets</h2>
          <span className={styles.total} role="status">
            {confirming
              ? timedOut
                ? "Payment not confirmed yet"
                : "Confirming payment…"
              : `${ids.length} owned`}
          </span>
        </div>
        {account.anonymous && ids.length > 0 && (
          <div className={styles.libraryGuest}>
            <p>Sign in to download them again later, on any device.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSigningIn(true)}
            >
              Sign in
            </Button>
            <SignInDialog
              open={signingIn}
              onOpenChange={setSigningIn}
              title="Sign in"
            />
          </div>
        )}
      </header>
      {ids.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Download />
            </EmptyMedia>
            <EmptyTitle>No presets yet</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onBrowse}>
              Browse presets
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className={styles.cartResults}>
          <ItemGroup className={styles.items}>
            {ids.map((presetId) => {
              const preset = getCatalogPreset(presetId)!;
              return (
                <Item key={presetId} role="listitem" className={styles.item}>
                  <ItemContent className={styles.itemContent}>
                    <strong className={styles.cartName}>{preset.name}</strong>
                    <span className={styles.cartCategory}>
                      {preset.category}
                    </span>
                  </ItemContent>
                  <ItemActions className={styles.itemActions}>
                    {owned.includes(presetId) ? (
                      <PresetDownloadButton
                        presetId={presetId}
                        variant="outline"
                        size="sm"
                      />
                    ) : (
                      <span className={styles.cartCategory}>Confirming</span>
                    )}
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        </div>
      )}
    </section>
  );
}
