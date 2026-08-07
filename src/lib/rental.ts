import { prisma } from "@/lib/prisma";

export function serializeDecimal(value: unknown) {
  return value == null ? "" : String(value);
}

export type PaymentAllocation = "DEPOSIT" | "RENT" | "MIXED";

export function allocatePayment({ amount, depositRequired, depositPaid }: { amount: number; depositRequired: number; depositPaid: number }) {
  const depositPortion = Math.min(amount, Math.max(0, depositRequired - depositPaid));
  const rentPortion = amount - depositPortion;
  const allocation: PaymentAllocation = depositPortion > 0 && rentPortion > 0 ? "MIXED" : depositPortion > 0 ? "DEPOSIT" : "RENT";

  return { depositPortion, rentPortion, allocation };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function monthsElapsed(start: Date, now: Date) {
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
}

export function nextRentDueDate(start: Date, graceDays: number, now = new Date()) {
  const rentDay = Math.min(start.getDate(), 28);
  let due = new Date(now.getFullYear(), now.getMonth(), rentDay);

  if (due < now) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, rentDay);
  }

  due.setDate(due.getDate() + graceDays);

  return due;
}

export function formatDate(value: Date) {
  return value.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

export async function paymentTotalsForLease(leaseId: string) {
  const result = await prisma.payment.aggregate({
    where: { leaseId, status: "CONFIRMED" },
    _sum: { rentPortion: true, depositPortion: true },
  });

  return {
    rentPaid: Number(result._sum.rentPortion ?? 0),
    depositPaid: Number(result._sum.depositPortion ?? 0),
  };
}

type LeaseLike = {
  monthlyRent: { toNumber(): number } | number | string;
  startDate: Date;
  graceDays: number;
};

export function leaseBalance(lease: LeaseLike, paid: number, now = new Date()) {
  const monthlyRent = typeof lease.monthlyRent === "number" ? lease.monthlyRent : Number(String(lease.monthlyRent));
  const months = Math.max(1, monthsElapsed(lease.startDate, now));
  const accrued = months * monthlyRent;

  return {
    monthlyRent,
    months,
    accrued,
    paid,
    balance: accrued - paid,
  };
}
