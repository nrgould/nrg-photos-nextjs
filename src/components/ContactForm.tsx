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
import { Arrow } from "./Arrow";
export default function ContactForm({
  emailEnabled,
  printTitle,
  isPrint,
}: {
  emailEnabled: boolean;
  printTitle?: string;
  isPrint: boolean;
}) {
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
        <h2>Your note is on its way.</h2>
        <p>
          Thanks for getting in touch. I’ll reply to the email address you
          shared.
        </p>
        <button className="text-link" onClick={() => setStatus("idle")}>
          Write another note <Arrow />
        </button>
      </div>
    );
  if (status === "draft")
    return (
      <div className="form-result" role="status">
        <h2>Your draft is ready.</h2>
        <p>
          Open it in your email app, then press send. Your inquiry hasn’t been
          sent yet.
        </p>
        <a className="solid-button" href={draft}>
          Open email draft <Arrow diagonal />
        </a>
        <button className="text-link" onClick={() => setStatus("idle")}>
          Back to your note
        </button>
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
        <label htmlFor="name">
          Your name
          <input
            id="name"
            name="name"
            defaultValue={lastInput?.name}
            autoComplete="name"
            required
            maxLength={100}
            placeholder="First and last name"
          />
        </label>
        <label htmlFor="email">
          Email address
          <input
            id="email"
            name="email"
            defaultValue={lastInput?.email}
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label htmlFor="interest">
        What brings you here?
        <select
          id="interest"
          name="interest"
          defaultValue={
            lastInput?.interest ??
            (isPrint ? "Fine art print" : "Brand & lifestyle")
          }
        >
          {interests.map((interest) => (
            <option key={interest}>{interest}</option>
          ))}
        </select>
      </label>
      <label htmlFor="message">
        A little about your idea
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={5000}
          defaultValue={
            lastInput?.message ??
            (printTitle
              ? `I’m interested in a print of “${printTitle}”. Please share the available sizes and pricing.`
              : "")
          }
          placeholder="The story, the place, the timing. Anything you’d like me to know."
        />
      </label>
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
        <button
          className="solid-button"
          disabled={status === "sending"}
          type="submit"
        >
          {status === "sending"
            ? "Sending your note…"
            : emailEnabled
              ? "Send your note"
              : "Prepare an email"}
          <Arrow diagonal />
        </button>
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
