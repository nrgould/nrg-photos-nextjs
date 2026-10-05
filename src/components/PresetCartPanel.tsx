"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ArrowLeft, LockKeyhole, ShoppingBag, X } from "lucide-react";
import { getCatalogPreset } from "@/lib/preset-commerce";
import { cn } from "@/lib/utils";
import { BULK_DISCOUNT_MINIMUM, UNIT_PRICE_CENTS } from "@/lib/preset-cart";
import {
  formatPresetPrice,
  safePresetReturnPath,
} from "@/lib/preset-cart-storage";
import { usePresetCart } from "./PresetCartProvider";
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

export type PresetCheckoutRequest = {
  paidPresetIds: string[];
  returnPath: string;
};
export type PresetCheckoutBoundary =
  | { status: "unavailable"; message?: string }
  | {
      status: "test-ready" | "ready";
      startCheckout: (request: PresetCheckoutRequest) => Promise<void>;
    };
export const unavailablePresetCheckout = {
  status: "unavailable",
  message: "Cart saved.",
} satisfies PresetCheckoutBoundary;

export default function PresetCartPanel({
  onBack,
  onBrowse = onBack,
  backLabel = "Presets",
  returnPath = "/",
  checkout = unavailablePresetCheckout,
}: {
  onBack?: () => void;
  onBrowse?: () => void;
  backLabel?: string;
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
    if (checkout.status === "unavailable" || pending || cartIds.length === 0)
      return;
    setPending(true);
    setError(null);
    try {
      await checkout.startCheckout({
        paidPresetIds: [...cartIds],
        returnPath: safePresetReturnPath(returnPath),
      });
    } catch {
      setError("Checkout could not open. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={styles.cartPanel}
      data-drawer-scroll
      aria-labelledby={`${id}-heading`}
    >
      <header className={styles.header}>
        {onBack && (
          <Button
            ref={backButton}
            variant="quiet"
            className={styles.back}
            onClick={onBack}
          >
            <ArrowLeft size={16} aria-hidden="true" /> {backLabel}
          </Button>
        )}
        <div className={styles.heading}>
          <h2 id={`${id}-heading`}>Cart</h2>
          {cartIds.length > 0 && (
            <span className={styles.cartCount}>
              <span className={styles.total}>{quote.paidCount} in cart</span>
              <Button
                variant="quiet"
                onClick={() => {
                  clearCart();
                  requestAnimationFrame(() => backButton.current?.focus());
                }}
              >
                Clear cart
              </Button>
            </span>
          )}
        </div>
      </header>
      {cartIds.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBag />
            </EmptyMedia>
            <EmptyTitle>Your cart is empty</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onBrowse}>
              Browse presets
            </Button>
          </EmptyContent>
        </Empty>
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
                        variant="quiet"
                        className={cn(
                          styles.add,
                          "justify-center hover:text-foreground hover:no-underline",
                        )}
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
                        <X size={16} strokeWidth={1.5} aria-hidden="true" />
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          </div>
          <footer className={styles.cartSummary}>
            {remaining > 0 && (
              <p className={styles.discountHint} role="status">
                {remaining} more for 20% off
              </p>
            )}
            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPresetPrice(quote.paidSubtotalCents)}</dd>
              </div>
              {quote.discountCents > 0 && (
                <div>
                  <dt>20% discount</dt>
                  <dd>−{formatPresetPrice(quote.discountCents)}</dd>
                </div>
              )}
              <div className={styles.totalLine}>
                <dt>Total · USD</dt>
                <dd>{formatPresetPrice(quote.totalCents)}</dd>
              </div>
            </dl>
            <Button
              size="lg"
              variant="default"
              className="w-full"
              disabled={checkout.status === "unavailable" || pending}
              aria-busy={pending}
              onClick={beginCheckout}
            >
              {checkout.status === "unavailable"
                ? "Checkout unavailable"
                : checkout.status === "test-ready"
                  ? pending
                    ? "Opening test checkout…"
                    : "Continue to test checkout"
                  : pending
                    ? "Opening checkout…"
                    : "Continue to checkout"}
              <LockKeyhole aria-hidden="true" />
            </Button>
            {checkout.status === "ready" && (
              <p className={styles.notice}>
                <Link
                  href="/terms#refunds"
                  className="underline underline-offset-2"
                >
                  Terms and 14-day refunds
                </Link>
              </p>
            )}
            {checkout.status !== "ready" && (
              <p className={styles.notice}>
                {checkout.status === "unavailable"
                  ? (checkout.message ?? unavailablePresetCheckout.message)
                  : "Test mode. No live payment."}
              </p>
            )}
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
