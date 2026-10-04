type HapticEnvironment = {
  available: () => boolean;
  vibrate: (milliseconds: number) => boolean;
  now: () => number;
};

export function createSelectionFeedback(environment: HapticEnvironment) {
  let lastPulse = -Infinity;
  return () => {
    if (!environment.available()) return false;
    const now = environment.now();
    if (now - lastPulse < 100) return false;
    try {
      lastPulse = now;
      // Acceptance is not proof that a device has enabled vibration hardware.
      return environment.vibrate(8);
    } catch {
      return false;
    }
  };
}

export const selectionFeedback = createSelectionFeedback({
  available: () =>
    typeof window !== "undefined" &&
    typeof navigator.vibrate === "function" &&
    navigator.userActivation?.hasBeenActive === true &&
    document.visibilityState === "visible" &&
    window.matchMedia("(any-pointer: coarse)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  vibrate: (milliseconds) => navigator.vibrate(milliseconds),
  now: () => performance.now(),
});
