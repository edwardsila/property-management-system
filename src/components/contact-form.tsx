"use client";

import { useState } from "react";

type FormState =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function ContactForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fullName.trim() || !phone.trim() || !message.trim()) {
      setFormState({ status: "error", message: "Please fill in your name, phone number, and a short message." });
      return;
    }

    setFormState({ status: "sending" });

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, message }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Something went wrong. Please try again or email us directly.");
      }

      setFormState({ status: "success" });
      setFullName("");
      setPhone("");
      setMessage("");
    } catch (error) {
      setFormState({
        status: "error",
        message: error instanceof Error ? error.message : "Something went wrong. Please try again or email us directly.",
      });
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-semibold text-navy" htmlFor="name">
          Full name
        </label>
        <input
          id="name"
          className="mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
          placeholder="Your name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-navy" htmlFor="phone">
          Phone number
        </label>
        <input
          id="phone"
          className="mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
          placeholder="+254 ..."
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-navy" htmlFor="message">
          How can we help?
        </label>
        <textarea
          id="message"
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
          placeholder="Tell us about your property or cleaning needs"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </div>
      {formState.status === "success" ? (
        <p className="rounded-xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm font-medium text-leaf-dark">
          Thank you — your request has been received. We will get back to you soon.
        </p>
      ) : null}
      {formState.status === "error" ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-600">
          {formState.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={formState.status === "sending"}
        className="rounded-full bg-leaf px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-leaf-dark disabled:opacity-60"
      >
        {formState.status === "sending" ? "Sending..." : "Send a request"}
      </button>
    </form>
  );
}
