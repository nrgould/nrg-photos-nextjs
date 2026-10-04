"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type Account = {
  enabled: boolean;
  /** undefined while the stored session is still loading. */
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  email: string | null;
  /** A guest session from checkout; it becomes permanent once an email is linked. */
  anonymous: boolean;
  supabase: SupabaseClient | null;
};
const signedOut = {
  userId: null,
  sessionId: null,
  email: null,
  anonymous: false,
};
const AccountSession = createContext<Account>({
  enabled: false,
  supabase: null,
  ...signedOut,
});

// The JWT's session_id stays stable across hourly token refreshes.
const sessionIdOf = (token: string) =>
  JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    .session_id as string;

function ConfiguredSession({
  account,
  children,
}: {
  account: { supabaseUrl: string; publishableKey: string };
  children: ReactNode;
}) {
  const [supabase] = useState(() =>
    createBrowserClient(account.supabaseUrl, account.publishableKey),
  );
  const [session, setSession] = useState<Omit<
    Account,
    "enabled" | "supabase"
  > | null>(null);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(
        next
          ? {
              userId: next.user.id,
              sessionId: sessionIdOf(next.access_token),
              email: next.user.email ?? null,
              anonymous: next.user.is_anonymous ?? false,
            }
          : signedOut,
      ),
    );
    return () => data.subscription.unsubscribe();
  }, [supabase]);
  return (
    <AccountSession
      value={{
        enabled: true,
        supabase,
        ...(session ?? {
          userId: undefined,
          sessionId: undefined,
          email: null,
          anonymous: false,
        }),
      }}
    >
      {children}
    </AccountSession>
  );
}
export function CommerceProviders({
  children,
  account,
}: {
  children: ReactNode;
  account: { supabaseUrl: string; publishableKey: string } | null;
}) {
  return account ? (
    <ConfiguredSession account={account}>{children}</ConfiguredSession>
  ) : (
    <AccountSession value={{ enabled: false, supabase: null, ...signedOut }}>
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
