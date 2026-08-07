import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { requireStaff } from "@/lib/auth";
import { requireStaffForProperty } from "@/lib/auth";
import { sendPaymentReceipt, activateLeaseOnFirstRent } from "@/lib/reconcile";
import { allocatePayment, paymentTotalsForLease } from "@/lib/rental";

type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";
type PaymentStatus = "PENDING" | "CONFIRMED" | "REVERSED";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { propertyId } = await params;
  const scopeError = await requireStaffForProperty(auth.user.id, auth.user.role, propertyId);

  if (scopeError) {
    return scopeError;
  }

  const payments = await prisma.payment.findMany({
    where: { propertyId },
    orderBy: [{ receivedAt: "desc" }],
  });

  return NextResponse.json({ payments });
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { propertyId } = await params;
  const scopeError = await requireStaffForProperty(auth.user.id, auth.user.role, propertyId);

  if (scopeError) {
    return scopeError;
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const leaseId = getString(body.leaseId);
  const tenantId = getString(body.tenantId);
  const amount = getString(body.amount);
  const status = (body.status as PaymentStatus | undefined) ?? "CONFIRMED";

  if (!leaseId || !tenantId || !amount) {
    return jsonError("Lease, tenant, and amount are required");
  }

  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, select: { depositAmount: true } });
  const amountNumber = Number(amount);
  const depositRequired = lease ? Number(lease.depositAmount ?? 0) : 0;
  const depositPaidBefore = (await paymentTotalsForLease(leaseId)).depositPaid;
  const split = allocatePayment({ amount: amountNumber, depositRequired, depositPaid: depositPaidBefore });

  const payment = await prisma.payment.create({
    data: {
      propertyId,
      leaseId,
      tenantId,
      amount,
      method: (body.method as PaymentMethod | undefined) ?? "CASH",
      status,
      allocation: split.allocation,
      depositPortion: String(split.depositPortion),
      rentPortion: String(split.rentPortion),
      reference: getString(body.reference) || null,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      notes: getString(body.notes) || null,
    },
  });

  let message = null;

  if (status === "CONFIRMED" && body.sendSms !== false) {
    message = await sendPaymentReceipt({
      leaseId,
      tenantId,
      amount: amountNumber,
      reference: getString(body.reference) || null,
      latestRentPortion: split.rentPortion,
      depositRequired,
    });
  }

  if (status === "CONFIRMED") {
    await activateLeaseOnFirstRent(leaseId);
  }

  return NextResponse.json(
    {
      payment,
      message: message
        ? {
            id: message.id,
            status: message.status,
            error: message.error ?? null,
            sentAt: message.sentAt?.toISOString() ?? null,
          }
        : null,
    },
    { status: 201 },
  );
}
