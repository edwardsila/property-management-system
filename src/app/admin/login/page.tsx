"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type StatusResponse = {
  authenticated: boolean;
  setup?: boolean;
  phone?: string | null;
};

type RequestResponse = {
  ok?: boolean;
  devMode?: boolean;
  hint?: string;
  error?: string;
};

const inputClass =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-600 focus:ring-1 focus:ring-slate-600";

export default function AdminLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [setup, setSetup] = useState(false);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devHint, setDevHint] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/auth/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: StatusResponse) => {
        if (!active) {
          return;
        }

        if (data.authenticated) {
          router.replace("/admin");
          return;
        }

        setSetup(Boolean(data.setup));
        if (typeof data.phone === "string" && data.phone) {
          setPhone(data.phone);
        }
        setChecking(false);
      })
      .catch(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  async function requestCode() {
    setError("");
    setDevHint("");

    if (!phone.trim()) {
      setError("Enter your phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = (await response.json().catch(() => ({}))) as RequestResponse;

      if (!response.ok) {
        setError(data.error || "Unable to send the verification code.");
        setSubmitting(false);
        return;
      }

      if (data.devMode && data.hint) {
        setDevHint(data.hint);
      }

      setStep("code");
      setSubmitting(false);
      requestAnimationFrame(() => codeInputRef.current?.focus());
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step === "phone") {
      await requestCode();
      return;
    }

    setError("");

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });

      const data = (await response.json().catch(() => ({}))) as RequestResponse;

      if (!response.ok) {
        setError(data.error || "Unable to verify the code.");
        setSubmitting(false);
        return;
      }

      router.replace("/admin");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    await requestCode();
    setResending(false);
  }

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-md border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-sm text-slate-500">Checking account…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-md border border-slate-800 bg-slate-900 p-8">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-800 text-slate-100">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M12 3 4 9v12h6v-6h4v6h6V9l-8-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M8 6h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-50">Terava Property Management</h1>
              <p className="mt-1 text-sm text-slate-500">
                {step === "phone"
                  ? setup
                    ? "Set up your administrator phone number"
                    : "Owner or agent sign in"
                  : "Enter the verification code"}
              </p>
            </div>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            {step === "phone" ? (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="phone">
                  Phone number
                </label>
                <input
                  id="phone"
                  className={inputClass}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="0712 345 678"
                  inputMode="tel"
                  autoComplete="tel"
                  disabled={submitting}
                />
                {setup ? (
                  <p className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
                    First-time setup. This phone number will receive your admin login codes. You can change it later with the
                    ADMIN_PHONE env var or the set-admin-phone script.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500" htmlFor="code">
                  Verification code
                </label>
                <input
                  id="code"
                  ref={codeInputRef}
                  className={inputClass}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  disabled={submitting}
                />
                <p className="text-xs text-slate-500">
                  Sent to <span className="font-semibold text-slate-300">{phone}</span>
                </p>
              </div>
            )}

            {devHint ? (
              <p className="rounded-md border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">{devHint}</p>
            ) : null}

            {error ? (
              <p className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {step === "phone" ? (submitting ? "Sending code…" : "Send code") : submitting ? "Verifying…" : "Sign in"}
            </button>
          </form>

          {step === "code" ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-4 block w-full text-center text-sm text-slate-500 transition hover:text-slate-300 disabled:opacity-60"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          ) : null}

          <Link href="/" className="mt-6 block text-center text-sm text-slate-500 transition hover:text-slate-300">
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
