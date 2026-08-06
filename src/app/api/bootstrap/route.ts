import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSmsConfig } from "@/lib/termii";
import { requireAdmin } from "@/lib/auth";

type PropertyRecord = Awaited<ReturnType<typeof prisma.property.findMany>>[number];
type FloorRecord = Awaited<ReturnType<typeof prisma.floor.findMany>>[number];
type UnitTypeRecord = Awaited<ReturnType<typeof prisma.unitType.findMany>>[number];
type UnitRecord = Awaited<ReturnType<typeof prisma.unit.findMany>>[number];
type TenantRecord = Awaited<ReturnType<typeof prisma.tenant.findMany>>[number];
type LeaseRecord = Awaited<ReturnType<typeof prisma.lease.findMany>>[number];
type PaymentRecord = Awaited<ReturnType<typeof prisma.payment.findMany>>[number];
type MessageRecord = Awaited<ReturnType<typeof prisma.message.findMany>>[number];
type IncomingPaymentRecord = Awaited<ReturnType<typeof prisma.incomingPayment.findMany>>[number];
type ExpenseRecord = Awaited<ReturnType<typeof prisma.expense.findMany>>[number];
type MaintenanceRequestRecord = Awaited<ReturnType<typeof prisma.maintenanceRequest.findMany>>[number];
type InquiryRecord = Awaited<ReturnType<typeof prisma.inquiry.findMany>>[number];

function serializeDate(value: Date) {
  return value.toISOString();
}

function serializeDecimal(value: unknown) {
  return value == null ? "" : String(value);
}

export async function GET() {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const [properties, floors, unitTypes, units, tenants, leases, payments, messages, incoming, expenses, maintenance, inquiries]: [
    PropertyRecord[],
    FloorRecord[],
    UnitTypeRecord[],
    UnitRecord[],
    TenantRecord[],
    LeaseRecord[],
    PaymentRecord[],
    MessageRecord[],
    IncomingPaymentRecord[],
    ExpenseRecord[],
    MaintenanceRequestRecord[],
    InquiryRecord[],
  ] = await Promise.all([
    prisma.property.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.floor.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.unitType.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.unit.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.tenant.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.lease.findMany({ orderBy: [{ createdAt: "asc" }] }),
    prisma.payment.findMany({ orderBy: [{ receivedAt: "desc" }] }),
    prisma.message.findMany({ orderBy: [{ createdAt: "desc" }], take: 100 }),
    prisma.incomingPayment.findMany({ orderBy: [{ status: "asc" }, { receivedAt: "desc" }], take: 200 }),
    prisma.expense.findMany({ orderBy: [{ occurredAt: "desc" }], take: 500 }),
    prisma.maintenanceRequest.findMany({ orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }], take: 200 }),
    prisma.inquiry.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 }),
  ]);

  const smsConfig = getSmsConfig();

  return NextResponse.json({
    sms: {
      configured: smsConfig !== null,
      mode: smsConfig ? "termii" : "simulated",
      senderId: smsConfig?.senderId ?? null,
    },
    properties: properties.map((property) => ({
      ...property,
      createdAt: serializeDate(property.createdAt),
      updatedAt: serializeDate(property.updatedAt),
    })),
    floors: floors.map((floor) => ({
      ...floor,
      createdAt: serializeDate(floor.createdAt),
      updatedAt: serializeDate(floor.updatedAt),
    })),
    unitTypes: unitTypes.map((unitType) => ({
      ...unitType,
      defaultRent: serializeDecimal(unitType.defaultRent),
      defaultDeposit: serializeDecimal(unitType.defaultDeposit),
      createdAt: serializeDate(unitType.createdAt),
      updatedAt: serializeDate(unitType.updatedAt),
    })),
    units: units.map((unit) => ({
      ...unit,
      areaSqFt: serializeDecimal(unit.areaSqFt),
      rentAmount: serializeDecimal(unit.rentAmount),
      depositAmount: serializeDecimal(unit.depositAmount),
      createdAt: serializeDate(unit.createdAt),
      updatedAt: serializeDate(unit.updatedAt),
    })),
    tenants: tenants.map((tenant) => ({
      ...tenant,
      createdAt: serializeDate(tenant.createdAt),
      updatedAt: serializeDate(tenant.updatedAt),
    })),
    leases: leases.map((lease) => ({
      ...lease,
      monthlyRent: serializeDecimal(lease.monthlyRent),
      depositAmount: serializeDecimal(lease.depositAmount),
      startDate: serializeDate(lease.startDate),
      endDate: lease.endDate ? serializeDate(lease.endDate) : null,
      moveInDate: lease.moveInDate ? serializeDate(lease.moveInDate) : null,
      moveOutDate: lease.moveOutDate ? serializeDate(lease.moveOutDate) : null,
      createdAt: serializeDate(lease.createdAt),
      updatedAt: serializeDate(lease.updatedAt),
    })),
    payments: payments.map((payment) => ({
      ...payment,
      amount: serializeDecimal(payment.amount),
      receivedAt: serializeDate(payment.receivedAt),
      createdAt: serializeDate(payment.createdAt),
      updatedAt: serializeDate(payment.updatedAt),
    })),
    messages: messages.map((message) => ({
      ...message,
      sentAt: message.sentAt ? serializeDate(message.sentAt) : null,
      createdAt: serializeDate(message.createdAt),
      updatedAt: serializeDate(message.updatedAt),
    })),
    incoming: incoming.map((item) => ({
      ...item,
      amount: serializeDecimal(item.amount),
      receivedAt: serializeDate(item.receivedAt),
      matchedAt: item.matchedAt ? serializeDate(item.matchedAt) : null,
      createdAt: serializeDate(item.createdAt),
      updatedAt: serializeDate(item.updatedAt),
    })),
    expenses: expenses.map((expense) => ({
      ...expense,
      amount: serializeDecimal(expense.amount),
      occurredAt: serializeDate(expense.occurredAt),
      createdAt: serializeDate(expense.createdAt),
      updatedAt: serializeDate(expense.updatedAt),
    })),
    maintenance: maintenance.map((request) => ({
      ...request,
      resolvedAt: request.resolvedAt ? serializeDate(request.resolvedAt) : null,
      createdAt: serializeDate(request.createdAt),
      updatedAt: serializeDate(request.updatedAt),
    })),
    inquiries: inquiries.map((inquiry) => ({
      ...inquiry,
      createdAt: serializeDate(inquiry.createdAt),
      updatedAt: serializeDate(inquiry.updatedAt),
    })),
  });
}
