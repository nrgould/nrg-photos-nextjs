"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

type AccountConfiguration = {
  supabaseUrl: string;
  publishableKey: string;
  captchaSiteKey: string | null;
};
type Account = {
  enabled: boolean;
  /** undefined while the stored session is still loading. */
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  email: string | null;
  /** A guest session from checkout; it becomes permanent once an email is linked. */
  anonymous: boolean;
  supabase: SupabaseClient | null;
  /** A Turnstile token for Supabase calls that create sessions; undefined without a site key. */
  captcha: () => Promise<string | undefined>;
};
const signedOut = {
  userId: null,
  sessionId: null,
  email: null,
  anonymous: false,
};
const noCaptcha = async () => undefined;
const AccountSession = createContext<Account>({
  enabled: false,
  supabase: null,
  captcha: noCaptcha,
  ...signedOut,
});

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widget: string) => void;
  reset: (widget: string) => void;
};

// The widget is Invisible mode in Cloudflare, so it never asks for interaction behind a modal.
function useTurnstile(siteKey: string | null) {
  const slot = useRef<HTMLDivElement>(null);
  const widget = useRef<Promise<string> | null>(null);
  const waiting = useRef<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  } | null>(null);
  const captcha = useCallback(async () => {
    if (!siteKey) return undefined;
    widget.current ??= new Promise<string>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      const unavailable = () => {
        widget.current = null;
        script.remove();
        reject(new Error("Verification could not load. Try again."));
      };
      script.onerror = unavailable;
      script.onload = () => {
        const turnstile = (window as { turnstile?: Turnstile }).turnstile;
        if (!turnstile || !slot.current) return unavailable();
        const fail = () => {
          waiting.current?.reject(new Error("Verification failed. Try again."));
          return true;
        };
        resolve(
          turnstile.render(slot.current, {
            sitekey: siteKey,
            execution: "execute",
            callback: (token: string) => waiting.current?.resolve(token),
            "error-callback": fail,
            "expired-callback": fail,
            "timeout-callback": fail,
          }),
        );
      };
      document.head.append(script);
    });
    const id = await widget.current;
    const turnstile = (window as { turnstile?: Turnstile }).turnstile!;
    // Tokens are single use: every call runs a fresh challenge.
    return new Promise<string>((resolve, reject) => {
      waiting.current = { resolve, reject };
      turnstile.reset(id);
      turnstile.execute(id);
    }).finally(() => {
      waiting.current = null;
    });
  }, [siteKey]);
  return { slot, captcha };
}

// The JWT's session_id stays stable across hourly token refreshes.
const sessionIdOf = (token: string) =>
  JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    .session_id as string;

function ConfiguredSession({
  account,
  children,
}: {
  account: AccountConfiguration;
  children: ReactNode;
}) {
  const { slot, captcha } = useTurnstile(account.captchaSiteKey);
  const [supabase] = useState(() =>
    createBrowserClient(account.supabaseUrl, account.publishableKey),
  );
  const [session, setSession] = useState<Omit<
    Account,
    "enabled" | "supabase" | "captcha"
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
        captcha,
        ...(session ?? {
          userId: undefined,
          sessionId: undefined,
          email: null,
          anonymous: false,
        }),
      }}
    >
      {children}
      {account.captchaSiteKey && <div ref={slot} />}
    </AccountSession>
  );
}
export function CommerceProviders({
  children,
  account,
}: {
  children: ReactNode;
  account: AccountConfiguration | null;
}) {
  return account ? (
    <ConfiguredSession account={account}>{children}</ConfiguredSession>
  ) : (
    <AccountSession
      value={{
        enabled: false,
        supabase: null,
        captcha: noCaptcha,
        ...signedOut,
      }}
    >
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
