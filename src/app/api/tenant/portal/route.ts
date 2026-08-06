import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant-auth";
import { getDarajaConfig } from "@/lib/daraja";
import { leaseBalance, nextRentDueDate } from "@/lib/rental";

export async function GET() {
  const auth = await requireTenant();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { tenant } = auth;
  const now = new Date();

  const [property, leases, payments] = await Promise.all([
    prisma.property.findUnique({
      where: { id: tenant.propertyId },
      select: { name: true, location: true },
    }),
    prisma.lease.findMany({
      where: { tenantId: tenant.id, status: "ACTIVE" },
      orderBy: { startDate: "asc" },
      include: { unit: { select: { unitName: true, unitCode: true } } },
    }),
    prisma.payment.findMany({
      where: { tenantId: tenant.id, status: "CONFIRMED" },
      orderBy: { receivedAt: "desc" },
      take: 20,
    }),
  ]);

  const leaseRows = [];

  for (const lease of leases) {
    const paidResult = await prisma.payment.aggregate({
      where: { leaseId: lease.id, status: "CONFIRMED" },
      _sum: { amount: true },
    });

    const paid = Number(paidResult._sum.amount ?? 0);
    const balance = leaseBalance(lease, paid, now);

    leaseRows.push({
      id: lease.id,
      unitName: lease.unit?.unitName ?? null,
      unitCode: lease.unit?.unitCode ?? null,
      monthlyRent: balance.monthlyRent,
      paid,
      balance: balance.balance,
      nextDueDate: nextRentDueDate(lease.startDate, lease.graceDays, now),
    });
  }

  const totalBalance = leaseRows.reduce((sum, lease) => sum + Math.max(0, lease.balance), 0);

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      fullName: tenant.fullName,
      phone: tenant.phone,
    },
    property: property ?? null,
    leases: leaseRows.map((lease) => ({
      ...lease,
      nextDueDate: lease.nextDueDate.toISOString(),
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      amount: String(payment.amount),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      receivedAt: payment.receivedAt.toISOString(),
    })),
    totalBalance,
    mpesaConfigured: getDarajaConfig() !== null,
  });
}
