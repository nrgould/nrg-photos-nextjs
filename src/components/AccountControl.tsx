"use client";
import { useRef, useState, type FormEvent } from "react";
import { UserRound, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  const { enabled, supabase, userId, email, anonymous, captcha } =
    useCommerceAccount();
  const [open, setOpen] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // A guest links the email to keep its purchases; "email_change" is that code's type.
  const [codeType, setCodeType] = useState<"email" | "email_change">("email");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  if (!enabled || !supabase || userId === undefined) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const value = String(new FormData(event.currentTarget).get("value")).trim();
    setPending(true);
    setError(null);
    const redirect = window.location.origin + window.location.pathname;
    let error: { message: string; code?: string } | null = null;
    try {
      if (sentTo)
        ({ error } = await supabase.auth.verifyOtp({
          email: sentTo,
          token: value,
          type: codeType,
          options: { captchaToken: await captcha() },
        }));
      else {
        let type: typeof codeType = "email";
        if (anonymous) {
          ({ error } = await supabase.auth.updateUser(
            { email: value },
            { emailRedirectTo: redirect },
          ));
          if (!error) type = "email_change";
        }
        // ponytail: an email that already has an account signs into it, leaving guest
        // purchases on the guest id; merging them needs a server endpoint that checks both sessions.
        if (!anonymous || error?.code === "email_exists")
          ({ error } = await supabase.auth.signInWithOtp({
            email: value,
            options: {
              emailRedirectTo: redirect,
              captchaToken: await captcha(),
            },
          }));
        setCodeType(type);
      }
    } catch (thrown) {
      error = thrown instanceof Error ? thrown : new Error("Try again.");
    }
    setPending(false);
    if (error) return setError(error.message);
    if (sentTo) setOpen(false);
    else setSentTo(value);
  }

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
              onClick={() => {
                setSentTo(null);
                void supabase.auth.signOut();
              }}
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
      {/* Also closes when the account turns permanent, so a verified code exits with the dialog's animation. */}
      <Dialog
        open={open && (!userId || anonymous)}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent
          variant="panel"
          className="account-dialog explorer-overlay top-[max(16px,18vh)] w-[min(380px,calc(100vw-32px))] rounded-[14px] px-6 pt-5 pb-6"
          initialFocus={field}
        >
          <div className="account-dialog-header">
            <DialogTitle>Sign in</DialogTitle>
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
                className={cn(
                  "h-12 rounded-[11px] border border-line px-3.5 py-0 focus-visible:outline-offset-0",
                  sentTo && "tabular-nums tracking-[0.2em]",
                )}
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
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <Button type="submit" className="justify-center" disabled={pending}>
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
    </>
  );
}
