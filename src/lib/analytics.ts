import type { PostHog } from "posthog-js";
import { createStoredSnapshot } from "@/components/storedSnapshot";
import type { ExplorationEvent } from "./exploration-progress";

export type AnalyticsEvent =
  | ExplorationEvent["type"]
  | "exploration-milestone"
  | "place-selected"
  | "page-opened"
  | "preset-added"
  | "preset-removed"
  | "searched"
  | "checkout-started"
  | "preset-downloaded"
  | "sign-in-code-sent"
  | "signed-in"
  | "reward-claimed"
  | "contact-sent"
  | "theme-changed";

type Properties = Record<string, unknown>;

export type Consent = "" | "granted" | "denied";

export const analyticsKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// The visitor's banner choice. PostHog keeps its own copy, which only ever follows this one.
const consentStore = createStoredSnapshot("analytics-consent", "");
// Opting in starts a new PostHog identity, so the signed-in account is identified again.
let identity: [string, Properties] | null = null;

/** What PostHog is told so its stored consent matches the choice. Repeating an opt-in would send another $opt_in. */
export function consentAction(
  stored: Consent,
  current: ReturnType<PostHog["get_explicit_consent_status"]>,
) {
  if (!stored || stored === current) return null;
  return stored === "granted" ? "opt_in" : "opt_out";
}

function applyConsent(posthog: PostHog) {
  const action = consentAction(
    consentStore.get() as Consent,
    posthog.get_explicit_consent_status(),
  );
  if (action === "opt_out") posthog.opt_out_capturing();
  if (action === "opt_in") {
    posthog.opt_in_capturing();
    if (identity) posthog.identify(...identity);
  }
}

// Loaded beside the page, not in its first chunk; calls before then wait on it. Replay, errors and
// web vitals are switched in the PostHog project settings. Until the visitor accepts, and after they
// decline, events are counted without cookies. No key: nothing loads or sends.
const client: Promise<PostHog> | null =
  typeof window === "undefined" || !analyticsKey
    ? null
    : import("posthog-js").then(({ default: posthog }) => {
        posthog.init(analyticsKey, {
          api_host: "/relay",
          ui_host: "https://us.posthog.com",
          defaults: "2026-08-30",
          person_profiles: "identified_only",
          cookieless_mode: "on_reject",
        });
        applyConsent(posthog);
        return posthog;
      });

export function useConsent() {
  return consentStore.use() as Consent;
}

export function setConsent(granted: boolean) {
  consentStore.set(granted ? "granted" : "denied");
  void client?.then(applyConsent);
}

export function track(event: AnalyticsEvent, properties?: Properties) {
  void client?.then((posthog) => posthog.capture(event, properties));
}

export function identify(userId: string, properties: Properties) {
  identity = [userId, properties];
  void client?.then((posthog) => posthog.identify(userId, properties));
}

// PostHog's reset also clears its consent; the choice is put back.
export function reset() {
  identity = null;
  void client?.then((posthog) => {
    posthog.reset();
    applyConsent(posthog);
  });
}
