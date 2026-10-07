"use client";
import { useRef, useState, type FormEvent } from "react";
import { UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresetCommerceBoundary } from "./CommerceCartProvider";
import { useCommerceAccount } from "./CommerceProviders";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function AccountControl({ className }: { className?: string }) {
  const { enabled, supabase, userId, email, anonymous } = useCommerceAccount();
  const [open, setOpen] = useState(false);
  if (!enabled || !supabase || userId === undefined) return null;

  return (
    <>
      {userId && !anonymous ? (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="control"
                className={cn("font-medium", className)}
                aria-label={`Account, ${email}`}
              />
            }
          >
            {email?.[0]?.toUpperCase()}
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="explorer-overlay w-64 gap-3 p-4"
          >
            <p className="truncate text-sm text-muted-foreground">{email}</p>
            <Button
              variant="control"
              onClick={() => void supabase.auth.signOut()}
            >
              Sign out
            </Button>
          </PopoverContent>
        </Popover>
      ) : (
        <Button
          variant="control"
          className={className}
          aria-label="Sign in"
          onClick={() => setOpen(true)}
        >
          <UserRound size={18} className="min-[701px]:hidden" />
          <span className="max-[700px]:hidden">Sign in</span>
        </Button>
      )}
      <SignInDialog open={open} onOpenChange={setOpen} title="Sign in" />
    </>
  );
}

/**
 * The email-code sign-in. A guest keeps its id and purchases by linking the email;
 * a guest whose email already has an account signs into it and hands its purchases over.
 */
export function SignInDialog({
  open,
  onOpenChange,
  title,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onSignedIn?: () => void;
}) {
  const { supabase, userId, anonymous, captcha } = useCommerceAccount();
  const { refreshOwnership } = usePresetCommerceBoundary();
  const [sentTo, setSentTo] = useState<string | null>(null);
  // A guest links the email to keep its purchases; "email_change" is that code's type.
  const [codeType, setCodeType] = useState<"email" | "email_change">("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Unchecked by default: an account isn't consent to marketing email.
  const [optIn, setOptIn] = useState(false);
  const [signedIn, setSignedIn] = useState(userId);
  const field = useRef<HTMLInputElement>(null);
  // Signing out starts the next sign-in from the email step.
  if (signedIn !== userId) {
    setSignedIn(userId);
    if (!userId) setSentTo(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const value = String(form.get("value")).trim();
    setPending(true);
    setError(null);
    const redirect = window.location.origin + window.location.pathname;
    let error: { message: string; code?: string } | null = null;
    // Taken before the code swaps this guest's session for the account's.
    const guestToken =
      sentTo && anonymous && codeType === "email"
        ? (await supabase.auth.getSession()).data.session?.access_token
        : undefined;
    try {
      if (sentTo) {
        ({ error } = await supabase.auth.verifyOtp({
          email: sentTo,
          token: value,
          type: codeType,
          options: { captchaToken: await captcha() },
        }));
        if (!error && guestToken) {
          const response = await fetch("/api/commerce/adopt-guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guestToken }),
          });
          if (!response.ok)
            console.error("Moving guest purchases failed", response.status);
          refreshOwnership();
        }
      } else {
        let type: typeof codeType = "email";
        if (anonymous) {
          ({ error } = await supabase.auth.updateUser(
            { email: value },
            { emailRedirectTo: redirect },
          ));
          if (!error) type = "email_change";
        }
        if (!anonymous || error?.code === "email_exists")
          ({ error } = await supabase.auth.signInWithOtp({
            email: value,
            options: {
              emailRedirectTo: redirect,
              captchaToken: await captcha(),
            },
          }));
        setCodeType(type);
        setOptIn(form.has("optIn"));
      }
    } catch (thrown) {
      error = thrown instanceof Error ? thrown : new Error("Try again.");
    }
    setPending(false);
    if (error) return setError(error.message);
    if (!sentTo) return setSentTo(value);
    // Consent is kept on the account, with when it was given; the email list reads it from there.
    if (optIn) {
      const { error } = await supabase.auth.updateUser({
        data: { marketing_opt_in: new Date().toISOString() },
      });
      if (error) console.error("Saving the email opt-in failed", error);
    }
    onOpenChange(false);
    onSignedIn?.();
  }

  // Also closes when the account turns permanent, so a verified code exits with the dialog's animation.
  return (
    <Dialog
      open={open && (!userId || anonymous)}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <DialogContent
        variant="panel"
        className="account-dialog explorer-overlay top-[max(16px,18vh)] w-[min(380px,calc(100vw-32px))] rounded-[14px] px-6 pt-5 pb-6"
        initialFocus={field}
      >
        <div className="account-dialog-header">
          <DialogTitle>{title}</DialogTitle>
          <DialogClose render={<Button variant="quiet" aria-label="Close" />}>
            <X size={18} />
          </DialogClose>
        </div>
        {sentTo && (
          <DialogDescription className="account-dialog-sent">
            Code sent to <strong>{sentTo}</strong>
          </DialogDescription>
        )}
        <form className="account-dialog-form" onSubmit={submit}>
          <Label>
            {sentTo ? "Code" : "Email"}
            {/* Keyed so the email value never carries into the code field. */}
            <Input
              key={sentTo ? "code" : "email"}
              ref={field}
              name="value"
              autoFocus={Boolean(sentTo)}
              required
              aria-invalid={Boolean(error)}
              variant="boxed"
              className={cn(sentTo && "tabular-nums tracking-[0.2em]")}
              {...(sentTo
                ? {
                    inputMode: "numeric",
                    autoComplete: "one-time-code",
                    pattern: "[0-9]{6,10}",
                    maxLength: 10,
                  }
                : {
                    type: "email",
                    autoComplete: "email",
                    placeholder: "you@example.com",
                  })}
            />
          </Label>
          {!sentTo && (
            <label className="account-dialog-opt-in">
              <input type="checkbox" name="optIn" defaultChecked={optIn} />
              Email me when new presets come out
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" variant="default" size="lg" disabled={pending}>
            {sentTo
              ? pending
                ? "Signing in…"
                : "Sign in"
              : pending
                ? "Sending…"
                : "Email me a code"}
          </Button>
          {sentTo && (
            <Button
              type="button"
              variant="quiet"
              className="self-center"
              onClick={() => {
                setSentTo(null);
                setError(null);
              }}
            >
              Use a different email
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
