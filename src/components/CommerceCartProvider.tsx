"use client";
import { createContext, useContext, type ReactNode } from "react";
import { PresetCartProvider } from "./PresetCartProvider";
import { useCommerceBoundary } from "./useCommerceBoundary";

const CommerceBoundary = createContext<ReturnType<
  typeof useCommerceBoundary
> | null>(null);
export function CommerceCartProvider({ children }: { children: ReactNode }) {
  const boundary = useCommerceBoundary();
  return (
    <CommerceBoundary value={boundary}>
      <PresetCartProvider ownedPresetIds={boundary.ownedPresetIds}>
        {children}
      </PresetCartProvider>
    </CommerceBoundary>
  );
}
export function usePresetCommerceBoundary() {
  const boundary = useContext(CommerceBoundary);
  if (!boundary)
    throw new Error("usePresetCommerceBoundary requires CommerceCartProvider");
  return boundary;
}
