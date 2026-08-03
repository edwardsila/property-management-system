export function serializeDecimal(value: unknown) {
  return value == null ? "" : String(value);
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
