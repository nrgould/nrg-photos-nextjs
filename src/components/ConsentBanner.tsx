"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { analyticsKey, setConsent, useConsent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const noSubscribe = () => () => {};

/** Fixed until the visitor chooses; `inline` on the privacy page keeps it there to change the choice. */
export function ConsentBanner({ inline = false }: { inline?: boolean }) {
  const consent = useConsent();
  // The server cannot see the stored choice, so nothing renders until the browser can.
  const mounted = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  if (!analyticsKey || !mounted || (!inline && consent)) return null;
  return (
    <Item
      variant="outline"
      role="region"
      aria-label="Cookies"
      className={cn(
        "explorer-overlay bg-background",
        // Waits out the first-visit intro title, then fades in.
        !inline &&
          "fixed bottom-5 left-2 z-40 max-w-sm transition-[opacity,translate] duration-300 ease-out starting:translate-y-2 starting:opacity-0 max-sm:inset-x-2 max-sm:bottom-3 max-sm:w-auto max-sm:max-w-none [body:has(.intro-title)_&]:hidden",
      )}
    >
      <ItemContent>
        <ItemTitle>Cookies</ItemTitle>
        <ItemDescription className="line-clamp-none">
          We use analytics cookies to understand how the site is used. If you
          decline, visits are still counted, without cookies.{" "}
          <Link href="/privacy">Privacy</Link>
        </ItemDescription>
      </ItemContent>
      <ItemActions className="w-full justify-end">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={inline ? consent === "denied" : undefined}
          onClick={() => setConsent(false)}
        >
          {inline && consent === "denied" && <Check aria-hidden="true" />}
          Decline
        </Button>
        <Button
          variant="default"
          size="sm"
          aria-pressed={inline ? consent === "granted" : undefined}
          onClick={() => setConsent(true)}
        >
          {inline && consent === "granted" && <Check aria-hidden="true" />}
          Accept
        </Button>
      </ItemActions>
    </Item>
  );
}
