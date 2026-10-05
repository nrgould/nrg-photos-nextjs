"use client";
import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { Download } from "lucide-react";
import { getCatalogPreset } from "@/lib/preset-commerce";
import { useCommerceAccount } from "./CommerceProviders";
import { Button } from "./ui/button";

export function PresetDownloadButton({
  presetId,
  variant = "default",
  size,
  className,
}: { presetId: string } & Pick<
  ComponentProps<typeof Button>,
  "variant" | "size" | "className"
>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const account = useCommerceAccount();
  const sessionKey =
    account.userId && account.sessionId
      ? `${account.sessionId}:${account.userId}`
      : null;
  const activeSession = useRef(sessionKey);
  const request = useRef<AbortController | null>(null);
  useLayoutEffect(() => {
    activeSession.current = sessionKey;
    return () => {
      activeSession.current = null;
      request.current?.abort();
    };
  }, [sessionKey, presetId]);
  async function download() {
    if (busy || request.current || !sessionKey) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/commerce/download/${encodeURIComponent(presetId)}`,
        {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (controller.signal.aborted || activeSession.current !== sessionKey)
        return;
      if (!response.ok) {
        setMessage(
          response.status === 401
            ? "Sign in to download your presets."
            : response.status === 403
              ? "This preset is not in your account."
              : "Downloads are not available yet.",
        );
        return;
      }
      const payload: unknown = await response.json();
      if (controller.signal.aborted || activeSession.current !== sessionKey)
        return;
      if (
        !payload ||
        typeof payload !== "object" ||
        !("url" in payload) ||
        typeof payload.url !== "string" ||
        new URL(payload.url).protocol !== "https:" ||
        new URL(payload.url).username ||
        new URL(payload.url).password
      )
        throw new Error("Invalid download response");
      window.location.assign(payload.url);
    } catch {
      if (!controller.signal.aborted)
        setMessage("Downloads are not available yet.");
    } finally {
      if (request.current === controller) request.current = null;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled={busy || !sessionKey}
        aria-label={`Download ${getCatalogPreset(presetId)?.name ?? "preset"}`}
        onClick={download}
      >
        <Download aria-hidden="true" />
        {busy ? "Preparing…" : "Download"}
      </Button>
      <span role="status">{message}</span>
    </>
  );
}
