import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "../_shared";
import { leaseBalance } from "@/lib/rental";

function monthRange(month: string) {
  const parts = month.split("-").map(Number);
  const start = new Date(parts[0], parts[1] - 1, 1);
  const end = new Date(parts[0], parts[1], 1);

  return { start, end };
}

function currentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function confirmedPaymentsTotal(leaseId: string) {
  const result = await prisma.payment.aggregate({
    where: { leaseId, status: "CONFIRMED" },
    _sum: { amount: true },
  });

  return Number(result._sum.amount ?? 0);
}

async function rentCollectionReport(propertyId: string, month: string) {
  const { start, end } = monthRange(month);

  const payments = await prisma.payment.findMany({
    where: { propertyId, status: "CONFIRMED", receivedAt: { gte: start, lt: end } },
    orderBy: { receivedAt: "asc" },
    include: {
      tenant: { select: { id: true, fullName: true, phone: true } },
      lease: { select: { unit: { select: { unitName: true } } } },
    },
  });

  const byMethod: Record<string, number> = {};
  let totalCollected = 0;

  for (const payment of payments) {
    const amount = Number(payment.amount);
    totalCollected += amount;
    byMethod[payment.method] = (byMethod[payment.method] ?? 0) + amount;
  }

  const activeLeases = await prisma.lease.findMany({
    where: { propertyId, status: "ACTIVE" },
    select: { monthlyRent: true },
  });

  const expectedRent = activeLeases.reduce((total, lease) => total + Number(lease.monthlyRent), 0);
  const collectionRate = expectedRent > 0 ? (totalCollected / expectedRent) * 100 : 0;

  return {
    type: "rent-collection",
    month,
    rows: payments.map((payment) => ({
      id: payment.id,
      receivedAt: payment.receivedAt.toISOString(),
      tenant: payment.tenant.fullName,
      unit: payment.lease?.unit?.unitName ?? "—",
      method: payment.method,
      amount: Number(payment.amount),
      reference: payment.reference,
    })),
    summary: {
      totalCollected,
      expectedRent,
      collectionRate,
      byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
      paymentCount: payments.length,
    },
  };
}

async function arrearsReport(propertyId: string) {
  const leases = await prisma.lease.findMany({
    where: { propertyId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    include: {
      tenant: { select: { id: true, fullName: true, phone: true } },
      unit: { select: { id: true, unitName: true } },
    },
  });

  const now = new Date();
  const rows: Array<Record<string, unknown>> = [];
  let totalArrears = 0;

  for (const lease of leases) {
    const paid = await confirmedPaymentsTotal(lease.id);
    const balance = leaseBalance(lease, paid, now);

    if (balance.balance <= 0) {
      continue;
    }

    totalArrears += balance.balance;

    rows.push({
      leaseId: lease.id,
      unit: lease.unit?.unitName ?? "—",
      tenant: lease.tenant.fullName,
      phone: lease.tenant.phone,
      monthlyRent: balance.monthlyRent,
      months: balance.months,
      accrued: balance.accrued,
      paid: balance.paid,
      balance: balance.balance,
      graceDays: lease.graceDays,
    });
  }

  return {
    type: "arrears",
    rows,
    summary: { totalArrears, count: rows.length },
  };
}

async function occupancyReport(propertyId: string) {
  const units = await prisma.unit.findMany({
    where: { propertyId },
    orderBy: { unitName: "asc" },
    include: {
      floor: { select: { label: true } },
      unitType: { select: { name: true } },
      leases: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { tenant: { select: { fullName: true } } },
      },
    },
  });

  const byStatus: Record<string, number> = {};
  let occupied = 0;

  for (const unit of units) {
    byStatus[unit.status] = (byStatus[unit.status] ?? 0) + 1;

    if (unit.leases.length > 0) {
      occupied += 1;
    }
  }

  const occupancyRate = units.length > 0 ? (occupied / units.length) * 100 : 0;

  return {
    type: "occupancy",
    rows: units.map((unit) => ({
      id: unit.id,
      unitName: unit.unitName,
      floor: unit.floor?.label ?? null,
      unitType: unit.unitType?.name ?? null,
      status: unit.status,
      tenant: unit.leases[0]?.tenant?.fullName ?? null,
    })),
    summary: {
      totalUnits: units.length,
      occupied,
      vacant: units.length - occupied,
      occupancyRate,
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    },
  };
}

async function tenantStatementReport(tenantId: string, propertyId: string) {
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, propertyId },
    include: {
      leases: {
        orderBy: { createdAt: "asc" },
        include: { unit: { select: { unitName: true } } },
      },
      payments: { orderBy: { receivedAt: "asc" } },
    },
  });

  if (!tenant) {
    return null;
  }

  const now = new Date();
  const leaseRows = tenant.leases.map((lease) => {
    const paid = tenant.payments
      .filter((payment) => payment.leaseId === lease.id && payment.status === "CONFIRMED")
      .reduce((total, payment) => total + Number(payment.amount), 0);
    const balance = leaseBalance(lease, paid, now);

    return {
      leaseId: lease.id,
      unit: lease.unit?.unitName ?? "—",
      status: lease.status,
      monthlyRent: balance.monthlyRent,
      startDate: lease.startDate.toISOString(),
      months: balance.months,
      accrued: balance.accrued,
      paid: balance.paid,
      balance: balance.balance,
    };
  });

  const confirmedPaid = tenant.payments
    .filter((payment) => payment.status === "CONFIRMED")
    .reduce((total, payment) => total + Number(payment.amount), 0);

  return {
    type: "tenant-statement",
    tenant: {
      id: tenant.id,
      fullName: tenant.fullName,
      phone: tenant.phone,
      email: tenant.email,
    },
    leases: leaseRows,
    payments: tenant.payments.map((payment) => ({
      id: payment.id,
      receivedAt: payment.receivedAt.toISOString(),
      amount: Number(payment.amount),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
    })),
    summary: { confirmedPaid },
  };
}

async function paymentSummaryReport(propertyId: string, month: string | null) {
  const where = {
    propertyId,
    ...(month ? { receivedAt: { gte: monthRange(month).start, lt: monthRange(month).end } } : {}),
  };

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { receivedAt: "desc" },
    include: {
      tenant: { select: { fullName: true } },
      lease: { select: { unit: { select: { unitName: true } } } },
    },
  });

  const byMethod: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalCollected = 0;

  for (const payment of payments) {
    const amount = Number(payment.amount);
    byStatus[payment.status] = (byStatus[payment.status] ?? 0) + 1;

    if (payment.status === "CONFIRMED") {
      totalCollected += amount;
      byMethod[payment.method] = (byMethod[payment.method] ?? 0) + amount;
    }
  }

  return {
    type: "payment-summary",
    month,
    rows: payments.map((payment) => ({
      id: payment.id,
      receivedAt: payment.receivedAt.toISOString(),
      tenant: payment.tenant.fullName,
      unit: payment.lease?.unit?.unitName ?? "—",
      method: payment.method,
      status: payment.status,
      amount: Number(payment.amount),
      reference: payment.reference,
    })),
    summary: {
      totalCollected,
      byMethod: Object.entries(byMethod).map(([method, total]) => ({ method, total })),
      byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "";
  const propertyId = url.searchParams.get("propertyId") ?? "";
  const month = url.searchParams.get("month") ?? currentMonth();
  const tenantId = url.searchParams.get("tenantId") ?? "";

  if (!propertyId) {
    return jsonError("Property is required for reports");
  }

  switch (type) {
    case "rent-collection":
      return NextResponse.json(await rentCollectionReport(propertyId, month));
    case "arrears":
      return NextResponse.json(await arrearsReport(propertyId));
    case "occupancy":
      return NextResponse.json(await occupancyReport(propertyId));
    case "tenant-statement": {
      if (!tenantId) {
        return jsonError("Select a tenant for a statement report");
      }

      const report = await tenantStatementReport(tenantId, propertyId);

      if (!report) {
        return jsonError("Tenant not found", 404);
      }

      return NextResponse.json(report);
    }
    case "payment-summary":
      return NextResponse.json(await paymentSummaryReport(propertyId, month));
    default:
      return jsonError("Unknown report type");
  }
}
