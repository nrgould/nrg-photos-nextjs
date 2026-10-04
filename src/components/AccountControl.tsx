"use client";
import { useState, type FormEvent } from "react";
import { useCommerceAccount } from "./CommerceProviders";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function AccountControl() {
  const { enabled, supabase, userId, email } = useCommerceAccount();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!enabled || !supabase || userId === undefined) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = sentTo
      ? await supabase.auth.verifyOtp({
          email: sentTo,
          token: String(form.get("code")).trim(),
          type: "email",
        })
      : await supabase.auth.signInWithOtp({
          email: String(form.get("email")).trim(),
        });
    setPending(false);
    if (error) return setError(error.message);
    if (!sentTo) setSentTo(String(form.get("email")).trim());
  }

  if (userId)
    return (
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="control"
              className="size-11 rounded-full p-0 font-medium"
              aria-label={`Account, ${email}`}
            />
          }
        >
          {email?.[0]?.toUpperCase()}
        </PopoverTrigger>
        <PopoverContent align="end" className="explorer-overlay w-64 gap-3 p-4">
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
    );

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setError(null);
      }}
    >
      <PopoverTrigger render={<Button variant="control" />}>
        Sign in
      </PopoverTrigger>
      <PopoverContent align="end" className="explorer-overlay w-72 p-4">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          {sentTo ? (
            <Label>
              Code sent to {sentTo}
              <Input
                key="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                required
                autoFocus
                aria-invalid={Boolean(error)}
              />
            </Label>
          ) : (
            <Label>
              Email
              <Input
                key="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                aria-invalid={Boolean(error)}
              />
            </Label>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {sentTo ? "Sign in" : "Email me a code"}
          </Button>
          {sentTo && (
            <Button
              type="button"
              variant="quiet"
              onClick={() => {
                setSentTo(null);
                setError(null);
              }}
            >
              Use a different email
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}
