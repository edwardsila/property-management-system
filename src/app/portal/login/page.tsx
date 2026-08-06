"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type StatusResponse = { authenticated?: boolean; tenant?: { fullName: string } | null };
type AuthResponse = { ok?: boolean; devMode?: boolean; hint?: string; error?: string };

const inputClass =
  "mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy";

export default function TenantLoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/tenant/auth/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: StatusResponse) => {
        if (!active) {
          return;
        }

        if (data.authenticated) {
          router.replace("/portal");
          return;
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

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenant/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json().catch(() => null)) as AuthResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "Unable to send the code. Try again.");
      }

      if (data.hint) {
        setNotice(data.hint);
      }

      setStep("code");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send the code. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tenant/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = (await response.json().catch(() => null)) as AuthResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "Unable to verify the code. Try again.");
      }

      router.replace("/portal");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to verify the code. Try again.");
      setCode("");
      codeInputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-navy-darker">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 sm:px-10 lg:px-12">
          <Link href="/" className="text-lg font-bold text-white">
            Terava <span className="text-leaf">Tenant Portal</span>
          </Link>
          <Link href="/" className="text-sm text-white/70 transition hover:text-white">
            Back to site
          </Link>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl bg-navy-light p-8">
          <h1 className="text-2xl font-extrabold text-navy">Tenant sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            {step === "phone"
              ? "Enter the phone number you registered with us and we will text you a one-time code."
              : `We sent a 6-digit code to ${phone}. Enter it below.`}
          </p>

          {checking ? <p className="mt-6 text-sm text-slate-500">Checking your session…</p> : null}

          {!checking && step === "phone" ? (
            <form className="mt-6" onSubmit={requestCode}>
              <label className="text-sm font-semibold text-navy" htmlFor="phone">
                Phone number
              </label>
              <input
                id="phone"
                className={inputClass}
                placeholder="0712 345 678 or +254712345678"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
              />
              <button
                type="submit"
                disabled={submitting || !phone.trim()}
                className="mt-5 w-full rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-white transition hover:bg-leaf-dark disabled:opacity-60"
              >
                {submitting ? "Sending code…" : "Send code"}
              </button>
            </form>
          ) : null}

          {!checking && step === "code" ? (
            <form className="mt-6" onSubmit={verifyCode}>
              <label className="text-sm font-semibold text-navy" htmlFor="code">
                Verification code
              </label>
              <input
                id="code"
                ref={codeInputRef}
                className={inputClass}
                placeholder="6-digit code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={submitting || code.length !== 6}
                className="mt-5 w-full rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-white transition hover:bg-leaf-dark disabled:opacity-60"
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                className="mt-3 w-full text-center text-sm font-medium text-navy underline-offset-2 hover:underline"
                onClick={() => setStep("phone")}
              >
                Use a different number
              </button>
            </form>
          ) : null}

          {notice ? <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-slate-700">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
