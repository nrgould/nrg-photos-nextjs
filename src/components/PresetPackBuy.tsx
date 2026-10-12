"use client";
import { useState } from "react";
import Link from "next/link";
import { usePresetCommerceBoundary } from "./CommerceCartProvider";
import { Button, buttonVariants } from "./ui/button";
import { presetCatalog } from "@/lib/preset-commerce";
import { pricePresetCart } from "@/lib/preset-cart";
import { formatPresetPrice } from "@/lib/preset-cart-storage";

/** Checkout for every preset the visitor does not own, at the cart's bulk price. */
export default function PresetPackBuy() {
  const { checkout, ownedPresetIds } = usePresetCommerceBoundary();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owned = new Set(ownedPresetIds);
  const ids = presetCatalog
    .filter((preset) => !owned.has(preset.id))
    .map((preset) => preset.id);
  const quote = pricePresetCart({ paidPresetIds: ids, rewardPresetId: null });

  if (ids.length === 0)
    return (
      <div className="pack-buy">
        <Link className={buttonVariants()} href="/?view=library">
          Your presets
        </Link>
      </div>
    );

  async function buy() {
    if (checkout.status === "unavailable" || pending) return;
    setPending(true);
    setError(null);
    try {
      await checkout.startCheckout({
        paidPresetIds: ids,
        // The server adds view=library on a paid return.
        returnPath: "/",
      });
    } catch {
      setError("Checkout could not open. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pack-buy">
      <p className="pack-price">
        {quote.discountCents > 0 && (
          <s>
            <span className="sr-only">Was </span>
            {formatPresetPrice(quote.paidSubtotalCents)}
          </s>
        )}{" "}
        <strong>{formatPresetPrice(quote.totalCents)}</strong>
        {quote.discountPercent > 0 && ` · ${quote.discountPercent}% off`}
      </p>
      <Button
        press
        disabled={checkout.status === "unavailable" || pending}
        onClick={buy}
      >
        {pending
          ? "Opening checkout…"
          : owned.size > 0
            ? `Buy the other ${ids.length}`
            : `Buy all ${ids.length}`}
      </Button>
      <p className="pack-note" role="status">
        {error}
      </p>
    </div>
  );
}
