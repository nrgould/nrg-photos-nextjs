"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCommerceAccount } from "./CommerceProviders";
import type {
  PresetCheckoutBoundary,
  PresetCheckoutRequest,
} from "./PresetCartPanel";
import {
  checkoutAttempt,
  checkoutReturnPath,
  currentOwnership,
  stripeCheckoutUrl,
  verifiedOwnership,
  type CheckoutAttempt,
  type OwnershipSnapshot,
} from "@/lib/commerce-checkout-client";

const attemptStorageKey = "photography-checkout-attempt-v1";
const emptyOwned: readonly string[] = [];

export function useCommerceBoundary() {
  const account = useCommerceAccount();
  const [availability, setAvailability] = useState<
    "unavailable" | "test-ready"
  >("unavailable");
  const [ownership, setOwnership] = useState<OwnershipSnapshot | null>(null);
  const [revision, setRevision] = useState(0);
  const attempt = useRef<CheckoutAttempt | null>(null);
  const pending = useRef(false);
  const checkoutRequest = useRef<AbortController | null>(null);
  const sessionKey =
    account.userId && account.sessionId
      ? `${account.sessionId}:${account.userId}`
      : null;
  const activeSession = useRef(sessionKey);
  useLayoutEffect(() => {
    activeSession.current = sessionKey;
    return () => {
      activeSession.current = null;
      checkoutRequest.current?.abort();
    };
  }, [sessionKey]);
  const refreshOwnership = useCallback(
    () => setRevision((value) => value + 1),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/commerce/availability", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok ? ((await response.json()) as unknown) : null,
      )
      .then((value) => {
        if (!controller.signal.aborted)
          setAvailability(
            value &&
              typeof value === "object" &&
              "status" in value &&
              value.status === "test-ready"
              ? "test-ready"
              : "unavailable",
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailability("unavailable");
      });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    const userId = account.userId;
    if (availability !== "test-ready" || !userId || !sessionKey) return;
    const controller = new AbortController();
    fetch("/api/commerce/ownership", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok ? verifiedOwnership(await response.json()) : null,
      )
      .then((presetIds) => {
        if (!controller.signal.aborted)
          setOwnership(presetIds ? { sessionKey, revision, presetIds } : null);
      })
      .catch(() => {
        if (!controller.signal.aborted) setOwnership(null);
      });
    return () => controller.abort();
  }, [account.userId, sessionKey, availability, revision]);

  useEffect(() => {
    window.addEventListener("focus", refreshOwnership);
    return () => window.removeEventListener("focus", refreshOwnership);
  }, [refreshOwnership]);

  const startCheckout = useCallback(
    async (request: PresetCheckoutRequest) => {
      if (
        availability !== "test-ready" ||
        !account.userId ||
        !sessionKey ||
        !currentOwnership(ownership, sessionKey, revision, true) ||
        pending.current
      )
        throw new Error("Checkout unavailable");
      pending.current = true;
      const controller = new AbortController();
      checkoutRequest.current = controller;
      try {
        let stored: unknown = attempt.current;
        if (!stored) {
          try {
            stored = JSON.parse(
              sessionStorage.getItem(attemptStorageKey) ?? "null",
            );
          } catch {}
        }
        const current = checkoutAttempt(
          account.userId,
          request.paidPresetIds,
          request.returnPath,
          stored,
          () => crypto.randomUUID(),
        );
        attempt.current = current;
        try {
          sessionStorage.setItem(attemptStorageKey, JSON.stringify(current));
        } catch {}
        const response = await fetch("/api/commerce/checkout", {
          method: "POST",
          credentials: "same-origin",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paidPresetIds: request.paidPresetIds,
            returnPath: checkoutReturnPath(request.returnPath),
            requestId: current.requestId,
          }),
        });
        if (controller.signal.aborted || activeSession.current !== sessionKey)
          throw new Error("Account session changed");
        if (!response.ok) {
          const error: unknown = await response.json().catch(() => null);
          if (
            error &&
            typeof error === "object" &&
            "error" in error &&
            [
              "order_not_pending",
              "checkout_attempt_expired",
              "checkout_unavailable",
            ].includes(String(error.error))
          ) {
            attempt.current = null;
            try {
              sessionStorage.removeItem(attemptStorageKey);
            } catch {}
          }
          refreshOwnership();
          throw new Error("Checkout unavailable");
        }
        const url = stripeCheckoutUrl(await response.json());
        if (controller.signal.aborted || activeSession.current !== sessionKey)
          throw new Error("Account session changed");
        if (!url) throw new Error("Invalid checkout response");
        window.location.assign(url);
      } finally {
        pending.current = false;
        if (checkoutRequest.current === controller)
          checkoutRequest.current = null;
      }
    },
    [
      account.userId,
      sessionKey,
      ownership,
      revision,
      availability,
      refreshOwnership,
    ],
  );

  const owned = currentOwnership(
    ownership,
    sessionKey,
    revision,
    availability === "test-ready",
  );
  const ready = Boolean(
    availability === "test-ready" && account.userId && sessionKey && owned,
  );

  // Signed-out checkout starts a guest session, then resumes once its ownership is confirmed.
  const guest = useRef<{
    request: PresetCheckoutRequest;
    resolve: () => void;
    reject: (error: unknown) => void;
  } | null>(null);
  const startGuestCheckout = useCallback(
    (request: PresetCheckoutRequest) =>
      new Promise<void>((resolve, reject) => {
        const supabase = account.supabase;
        if (!supabase || guest.current)
          return reject(new Error("Checkout unavailable"));
        const queued = { request, resolve, reject };
        guest.current = queued;
        const fail = (error: unknown) => {
          if (guest.current !== queued) return;
          guest.current = null;
          reject(error);
        };
        account
          .captcha()
          .then((captchaToken) =>
            supabase.auth.signInAnonymously({ options: { captchaToken } }),
          )
          .then(({ error }) => {
            if (error) return fail(error);
            setTimeout(() => fail(new Error("Checkout unavailable")), 15000);
          }, fail);
      }),
    [account],
  );
  useEffect(() => {
    const queued = guest.current;
    if (!queued || !ready) return;
    guest.current = null;
    startCheckout(queued.request).then(queued.resolve, queued.reject);
  }, [ready, startCheckout]);

  const checkout = useMemo<PresetCheckoutBoundary>(
    () =>
      ready
        ? { status: "test-ready", startCheckout }
        : availability === "test-ready" &&
            account.supabase &&
            account.userId === null
          ? { status: "test-ready", startCheckout: startGuestCheckout }
          : {
              status: "unavailable",
              message:
                availability === "test-ready" && sessionKey
                  ? "Confirming your account’s presets before checkout."
                  : "Cart saved.",
            },
    [
      availability,
      account.supabase,
      account.userId,
      ready,
      sessionKey,
      startCheckout,
      startGuestCheckout,
    ],
  );
  return {
    checkout,
    ownedPresetIds: owned ?? emptyOwned,
    ownershipStatus: owned ? ("verified" as const) : ("unknown" as const),
    refreshOwnership,
  };
}
