"use client";

import { useId, useRef, useState } from "react";
import { ArrowLeft, LockKeyhole, ShoppingBag, X } from "lucide-react";
import { getCatalogPreset } from "@/lib/preset-commerce";
import { BULK_DISCOUNT_MINIMUM, UNIT_PRICE_CENTS } from "@/lib/preset-cart";
import {
  formatPresetPrice,
  safePresetReturnPath,
} from "@/lib/preset-cart-storage";
import { usePresetCart } from "./PresetCartProvider";
import { Button } from "./ui/button";
import { Item, ItemActions, ItemContent, ItemGroup } from "./ui/item";
import styles from "./PresetCatalog.module.css";

export type PresetCheckoutRequest = {
  paidPresetIds: string[];
  returnPath: string;
};
export type PresetCheckoutBoundary =
  | { status: "unavailable"; message?: string }
  | {
      status: "test-ready";
      startCheckout: (request: PresetCheckoutRequest) => Promise<void>;
    };
export const unavailablePresetCheckout = {
  status: "unavailable",
  message: "Checkout is not available yet. Your selection stays in this cart.",
} satisfies PresetCheckoutBoundary;

export default function PresetCartPanel({
  onBack,
  returnPath = "/presets",
  checkout = unavailablePresetCheckout,
}: {
  onBack: () => void;
  returnPath?: string;
  checkout?: PresetCheckoutBoundary;
}) {
  const id = useId();
  const { cartIds, quote, removePreset, clearCart } = usePresetCart();
  const backButton = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = Math.max(0, BULK_DISCOUNT_MINIMUM - quote.paidCount);

  async function beginCheckout() {
    if (checkout.status !== "test-ready" || pending || cartIds.length === 0)
      return;
    setPending(true);
    setError(null);
    try {
      await checkout.startCheckout({
        paidPresetIds: [...cartIds],
        returnPath: safePresetReturnPath(returnPath),
      });
    } catch {
      setError(
        "Checkout could not open. Your selection is still here; please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.cartPanel} aria-labelledby={`${id}-heading`}>
      <header className={styles.header}>
        <Button
          ref={backButton}
          variant="quiet"
          className={styles.back}
          onClick={onBack}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Continue browsing
        </Button>
        <div className={styles.heading}>
          <h2 id={`${id}-heading`}>Your collection</h2>
          <span className={styles.total}>{quote.paidCount} in cart</span>
        </div>
        <p className={styles.availability}>
          Selected presets become yours after a confirmed purchase.
        </p>
      </header>
      {cartIds.length === 0 ? (
        <div className={styles.cartEmpty}>
          <ShoppingBag size={28} strokeWidth={1.5} aria-hidden="true" />
          <h3>Start with a favorite</h3>
          <p>Choose individual presets, or build a set of ten for 20% off.</p>
          <Button variant="control" className={styles.action} onClick={onBack}>
            Browse presets
          </Button>
        </div>
      ) : (
        <>
          <div ref={list} className={styles.cartResults}>
            <ItemGroup className={styles.items}>
              {cartIds.map((presetId, index) => {
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
                      <span className={styles.rowPrice}>
                        {formatPresetPrice(UNIT_PRICE_CENTS)}
                      </span>
                      <Button
                        variant="control"
                        className={styles.add}
                        data-remove-preset="true"
                        onClick={() => {
                          removePreset(presetId);
                          requestAnimationFrame(() => {
                            const buttons =
                              list.current?.querySelectorAll<HTMLButtonElement>(
                                "[data-remove-preset]",
                              );
                            const target =
                              buttons?.[Math.min(index, buttons.length - 1)];
                            (target ?? backButton.current)?.focus();
                          });
                        }}
                        aria-label={`Remove ${preset.name} from cart`}
                      >
                        <X size={16} aria-hidden="true" />
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
            <Button
              variant="quiet"
              className={styles.back}
              onClick={() => {
                clearCart();
                requestAnimationFrame(() => backButton.current?.focus());
              }}
            >
              Clear cart
            </Button>
          </div>
          <footer className={styles.cartSummary}>
            <p className={styles.discountHint} role="status">
              {remaining > 0
                ? `Add ${remaining} more ${remaining === 1 ? "preset" : "presets"} for 20% off your paid selection.`
                : "20% collection discount applied."}
            </p>
            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPresetPrice(quote.paidSubtotalCents)}</dd>
              </div>
              {quote.discountCents > 0 && (
                <div>
                  <dt>Collection discount (20%)</dt>
                  <dd>−{formatPresetPrice(quote.discountCents)}</dd>
                </div>
              )}
              <div className={styles.totalLine}>
                <dt>Total · USD</dt>
                <dd>{formatPresetPrice(quote.totalCents)}</dd>
              </div>
            </dl>
            <Button
              variant="solid"
              className={styles.buy}
              disabled={checkout.status === "unavailable" || pending}
              aria-busy={pending}
              onClick={beginCheckout}
            >
              {pending
                ? "Opening test checkout…"
                : checkout.status === "test-ready"
                  ? "Continue to test checkout"
                  : "Checkout unavailable"}
              <LockKeyhole size={16} aria-hidden="true" />
            </Button>
            <p className={styles.notice}>
              {checkout.status === "test-ready"
                ? "Test checkout only. No live payment is collected. Final pricing is verified by the server."
                : (checkout.message ?? unavailablePresetCheckout.message)}
            </p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </footer>
        </>
      )}
    </section>
  );
}
