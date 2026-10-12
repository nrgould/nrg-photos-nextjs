import type { PostHog } from "posthog-js";
import type { ExplorationEvent } from "./exploration-progress";

export type AnalyticsEvent =
  | ExplorationEvent["type"]
  | "exploration-milestone"
  | "place-selected"
  | "page-opened"
  | "preset-added"
  | "checkout-started"
  | "preset-downloaded"
  | "sign-in-code-sent"
  | "signed-in"
  | "reward-claimed"
  | "contact-sent"
  | "theme-changed";

type Properties = Record<string, unknown>;

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Loaded beside the page, not in its first chunk; calls before then wait on it. Replay, errors and
// web vitals are switched in the PostHog project settings. No key: nothing loads or sends.
const client: Promise<PostHog> | null =
  typeof window === "undefined" || !key
    ? null
    : import("posthog-js").then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: "/relay",
          ui_host: "https://us.posthog.com",
          defaults: "2026-08-30",
          person_profiles: "identified_only",
        });
        return posthog;
      });

export function track(event: AnalyticsEvent, properties?: Properties) {
  void client?.then((posthog) => posthog.capture(event, properties));
}

export function identify(userId: string, properties: Properties) {
  void client?.then((posthog) => posthog.identify(userId, properties));
}

export function reset() {
  void client?.then((posthog) => posthog.reset());
}
