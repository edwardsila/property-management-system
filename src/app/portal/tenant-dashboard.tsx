"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Tenant = { id: string; fullName: string; phone: string };

type PortalLease = {
  id: string;
  unitName: string | null;
  unitCode: string | null;
  paymentAccountRef: string | null;
  monthlyRent: number;
  paid: number;
  balance: number;
  depositRequired: number;
  depositPaid: number;
  nextDueDate: string;
};

type PortalPayment = {
  id: string;
  amount: string;
  method: string;
  status: string;
  reference: string | null;
  receivedAt: string;
};

type PortalData = {
  tenant: { id: string; fullName: string; phone: string };
  property: { name: string; location: string } | null;
  leases: PortalLease[];
  payments: PortalPayment[];
  totalBalance: number;
  paybillNumber: string | null;
  mpesaConfigured: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export default function TenantDashboard({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/tenant/portal", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as (PortalData & { error?: string }) | null;

      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "Unable to load your account.");
      }

      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your account.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/tenant/auth/logout", { method: "POST" });
    } catch {
      // cookie is cleared client-side via the response header regardless
    }

    router.replace("/portal/login");
  }

  async function payRent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    setPaying(true);

    try {
      const response = await fetch("/api/tenant/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Unable to start the M-Pesa payment.");
      }

      setNotice(payload.message ?? "Check your phone and enter your M-Pesa PIN.");
      setAmount("");
      setTimeout(load, 3000);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "Unable to start the M-Pesa payment.");
    } finally {
      setPaying(false);
    }
  }

  const activeLease = data?.leases[0] ?? null;
  const suggestedAmount = activeLease?.balance && activeLease.balance > 0 ? String(Math.min(activeLease.balance, activeLease.monthlyRent || 0)) : "";

  return (
    <main className="min-h-screen bg-navy-darker">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-12">
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-white">
              {loading ? "Loading…" : `Welcome, ${data?.tenant.fullName ?? tenant.fullName}`}
            </div>
            <div className="truncate text-sm text-white/60">{data?.property ? `${data.property.name} · ${data.property.location}` : "Tenant portal"}</div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/" className="text-sm text-white/70 transition hover:text-white">Home</Link>
            <button type="button" onClick={handleLogout} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/50 hover:bg-white/10">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8 sm:px-10 lg:grid-cols-[1fr_380px] lg:px-12">
        <div className="grid gap-6">
          {loading ? (
            <div className="rounded-2xl bg-navy-light p-8 text-sm text-slate-500">Loading your account…</div>
          ) : error && !data ? (
            <div className="rounded-2xl bg-navy-light p-8">
              <p className="text-sm text-rose-600">{error}</p>
              <button type="button" className="mt-4 rounded-full bg-leaf px-5 py-2.5 text-sm font-semibold text-white" onClick={() => { setError(""); setLoading(true); load(); }}>
                Try again
              </button>
            </div>
          ) : data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-navy-light p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy/60">Total balance</div>
                  <div className="mt-2 text-2xl font-extrabold text-navy">{formatMoney(data.totalBalance)}</div>
                  <div className="mt-1 text-xs text-slate-500">Rent accrued minus payments</div>
                </div>
                <div className="rounded-2xl bg-navy-light p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy/60">Monthly rent</div>
                  <div className="mt-2 text-2xl font-extrabold text-navy">{formatMoney(activeLease?.monthlyRent ?? 0)}</div>
                  <div className="mt-1 text-xs text-slate-500">{activeLease?.unitName ?? "No active lease"}</div>
                </div>
                <div className="rounded-2xl bg-navy-light p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy/60">Next due date</div>
                  <div className="mt-2 text-2xl font-extrabold text-navy">{activeLease ? formatDate(activeLease.nextDueDate) : "—"}</div>
                  <div className="mt-1 text-xs text-slate-500">Including grace period</div>
                </div>
                <div className="rounded-2xl bg-navy-light p-6">
                  <div className="text-xs font-semibold uppercase tracking-wide text-navy/60">Unit</div>
                  <div className="mt-2 truncate text-2xl font-extrabold text-navy">{activeLease?.unitName ?? "—"}</div>
                  <div className="mt-1 text-xs text-slate-500">{activeLease?.unitCode ?? "No active lease"}</div>
                </div>
              </div>

              <div className="rounded-2xl bg-navy-light p-6">
                <h2 className="text-lg font-bold text-navy">Your leases</h2>
                {data.leases.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">You do not have an active lease right now. Contact the property office if you think this is a mistake.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border-b border-navy/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-navy/60">Unit</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy/60">Monthly rent</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy/60">Deposit</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy/60">Paid</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy/60">Balance</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy/60">Next due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.leases.map((lease) => {
                          const depositDue = lease.depositRequired - lease.depositPaid;

                          return (
                            <tr key={lease.id}>
                              <td className="border-b border-navy/10 px-3 py-2 font-medium text-navy">{lease.unitName ?? "—"}</td>
                              <td className="border-b border-navy/10 px-3 py-2 text-right text-slate-700">{formatMoney(lease.monthlyRent)}</td>
                              <td className={`border-b border-navy/10 px-3 py-2 text-right ${depositDue > 0 ? "font-semibold text-amber-600" : "text-leaf-dark"}`}>{depositDue > 0 ? `${formatMoney(lease.depositPaid)} / ${formatMoney(lease.depositRequired)}` : "Paid"}</td>
                              <td className="border-b border-navy/10 px-3 py-2 text-right text-slate-700">{formatMoney(lease.paid)}</td>
                              <td className={`border-b border-navy/10 px-3 py-2 text-right font-semibold ${lease.balance > 0 ? "text-rose-600" : "text-leaf-dark"}`}>{formatMoney(lease.balance)}</td>
                              <td className="border-b border-navy/10 px-3 py-2 text-right text-slate-700">{formatDate(lease.nextDueDate)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-navy-light p-6">
                <h2 className="text-lg font-bold text-navy">Recent payments</h2>
                {data.payments.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No payments recorded yet.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="border-b border-navy/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-navy/60">Date</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-navy/60">Method</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-navy/60">Reference</th>
                          <th className="border-b border-navy/10 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy/60">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="border-b border-navy/10 px-3 py-2 text-slate-700">{formatDate(payment.receivedAt)}</td>
                            <td className="border-b border-navy/10 px-3 py-2 text-slate-700">{payment.method}</td>
                            <td className="border-b border-navy/10 px-3 py-2 text-slate-700">{payment.reference ?? "—"}</td>
                            <td className="border-b border-navy/10 px-3 py-2 text-right font-semibold text-leaf-dark">{formatMoney(Number(payment.amount))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <aside className="h-fit rounded-2xl bg-navy-light p-6">
          <h2 className="text-lg font-bold text-navy">Pay rent via M-Pesa</h2>
          <p className="mt-2 text-sm text-slate-600">Approve the request sent to your phone with your M-Pesa PIN and it lands in your account automatically.</p>

          {data?.paybillNumber && activeLease?.paymentAccountRef ? (
            <div className="mt-4 rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-navy">Pay directly from M-Pesa</div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <span className="text-slate-500">Paybill</span>
                <span className="font-bold tracking-wide text-navy">{data.paybillNumber}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-slate-500">Account number</span>
                <span className="font-bold tracking-wide text-navy">{activeLease.paymentAccountRef}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Open M-Pesa → Lipa na M-Pesa → Paybill → enter the number above, then the account number. Your payment is matched to your account automatically.</p>
            </div>
          ) : null}

          {!data?.mpesaConfigured ? (
            <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-slate-700">
              {data?.paybillNumber
                ? "Online payment requests are not enabled yet — use the Paybill details above to pay directly from your M-Pesa app."
                : "Online payments are not enabled yet. Please contact the property office for the paybill number to use."}
            </p>
          ) : (
            <form className="mt-4" onSubmit={payRent}>
              <label className="text-sm font-semibold text-navy" htmlFor="amount">Amount (KES)</label>
              <input
                id="amount"
                type="number"
                min="1"
                max="150000"
                className="mt-2 w-full rounded-xl border border-navy/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-navy"
                placeholder={suggestedAmount || "e.g. 7500"}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {activeLease?.balance && activeLease.balance > 0 ? (
                <p className="mt-2 text-xs text-slate-500">Current balance: {formatMoney(activeLease.balance)} · monthly rent {formatMoney(activeLease.monthlyRent)}</p>
              ) : null}
              <button
                type="submit"
                disabled={paying || !Number(amount) || Number(amount) <= 0}
                className="mt-4 w-full rounded-full bg-leaf px-6 py-3 text-sm font-semibold text-white transition hover:bg-leaf-dark disabled:opacity-60"
              >
                {paying ? "Sending request…" : "Request payment to my phone"}
              </button>
            </form>
          )}

          {notice ? <p className="mt-4 rounded-xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm text-leaf-dark">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">{error}</p> : null}
        </aside>
      </section>
    </main>
  );
}
