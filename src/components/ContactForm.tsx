"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  contactSchema,
  draftHref,
  interests,
  type ContactInput,
} from "@/lib/contact";
import { site } from "@/lib/site";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, type FieldVariant } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
export default function ContactForm({
  emailEnabled,
  variant,
}: {
  emailEnabled: boolean;
} & FieldVariant) {
  const label = cn(
    "mb-[31px] max-sm:mb-6",
    variant === "boxed" && "mb-4 max-sm:mb-4",
  );
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "draft" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [lastInput, setLastInput] = useState<ContactInput | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = contactSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Please check the form.");
      setStatus("error");
      return;
    }
    setLastInput(result.data);
    const href = draftHref(result.data);
    setDraft(href);
    if (!emailEnabled) {
      setStatus("draft");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || "Please try again.");
      setStatus("sent");
    } catch (error) {
      setStatus("error");
      setError(
        error instanceof Error
          ? error.message
          : "Your inquiry wasn’t sent. Please try again.",
      );
    }
  }
  if (status === "sent")
    return (
      <div className="form-result" role="status">
        <h2>Sent.</h2>
        <p>I’ll reply to the email address you entered.</p>
        <Button
          variant="link"
          className="mt-6 flex w-max"
          onClick={() => setStatus("idle")}
        >
          Send another
        </Button>
      </div>
    );
  if (status === "draft")
    return (
      <div className="form-result" role="status">
        <h2>Draft ready</h2>
        <p>
          Open it in your email app and press send. Nothing has been sent yet.
        </p>
        <a className={buttonVariants()} href={draft}>
          Open email draft
        </a>
        <Button
          variant="link"
          className="mt-6 flex w-max"
          onClick={() => setStatus("idle")}
        >
          Back
        </Button>
      </div>
    );
  return (
    <form
      className="contact-form"
      action={`mailto:${site.email}`}
      method="post"
      encType="text/plain"
      onSubmit={submit}
    >
      <div className="form-row">
        <Label htmlFor="name" className={label}>
          Name
          <Input
            variant={variant}
            id="name"
            name="name"
            defaultValue={lastInput?.name}
            autoComplete="name"
            required
            maxLength={100}
            placeholder="First and last name"
          />
        </Label>
        <Label htmlFor="email" className={label}>
          Email
          <Input
            variant={variant}
            id="email"
            name="email"
            defaultValue={lastInput?.email}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </Label>
      </div>
      <Label htmlFor="interest" className={label}>
        Project type
        <NativeSelect
          variant={variant}
          id="interest"
          name="interest"
          defaultValue={lastInput?.interest ?? "Brand & lifestyle"}
        >
          {interests.map((interest) => (
            <option key={interest}>{interest}</option>
          ))}
        </NativeSelect>
      </Label>
      <Label htmlFor="message" className={label}>
        Message
        <Textarea
          variant={variant}
          id="message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={5000}
          defaultValue={lastInput?.message ?? ""}
          placeholder="Dates, location and what you need"
        />
      </Label>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">
          Leave this empty
          <input id="website" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error} <a href={draft || `mailto:${site.email}`}>Email directly</a>
        </p>
      )}
      <div className="form-submit">
        <Button
          disabled={status === "sending"}
          type="submit"
          {...(variant === "boxed" && { variant: "default", size: "lg" })}
        >
          {status === "sending"
            ? "Sending…"
            : emailEnabled
              ? "Send"
              : "Open email draft"}
        </Button>
        <p>
          {emailEnabled
            ? "Your details are used only to reply to your inquiry."
            : "Prepare a draft to send from your own email app."}
        </p>
      </div>
      <noscript>
        <p>
          Please email <a href={`mailto:${site.email}`}>{site.email}</a>{" "}
          directly.
        </p>
      </noscript>
    </form>
  );
}
