"use client";
import { createContext, useContext, type ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";

const AccountSession = createContext<{
  enabled: boolean;
  userId: string | null | undefined;
  sessionId: string | null | undefined;
}>({ enabled: false, userId: null, sessionId: null });
function ConfiguredSession({ children }: { children: ReactNode }) {
  const { isLoaded, userId, sessionId } = useAuth();
  return (
    <AccountSession
      value={{
        enabled: true,
        userId: isLoaded ? userId : undefined,
        sessionId: isLoaded ? sessionId : undefined,
      }}
    >
      {children}
    </AccountSession>
  );
}
export function CommerceProviders({
  children,
  publishableKey,
}: {
  children: ReactNode;
  publishableKey: string | null;
}) {
  return publishableKey ? (
    <ClerkProvider publishableKey={publishableKey}>
      <ConfiguredSession>{children}</ConfiguredSession>
    </ClerkProvider>
  ) : (
    <AccountSession value={{ enabled: false, userId: null, sessionId: null }}>
      {children}
    </AccountSession>
  );
}
export function useCommerceAccountEnabled() {
  return useContext(AccountSession).enabled;
}
export function useCommerceAccount() {
  return useContext(AccountSession);
}
