import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireStaff } from "@/lib/auth";
import { requireStaffForProperty } from "@/lib/auth";
import { allocatePayment, paymentTotalsForLease } from "@/lib/rental";

type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";
type PaymentStatus = "PENDING" | "CONFIRMED" | "REVERSED";

export async function PATCH(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { paymentId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const existing = await prisma.payment.findUnique({ where: { id: paymentId } });

  if (!existing) {
    return jsonError("Payment not found", 404);
  }

  const scopeError = await requireStaffForProperty(auth.user.id, auth.user.role, existing.propertyId);

  if (scopeError) {
    return scopeError;
  }

  const leaseId = getString(body.leaseId);
  const tenantId = getString(body.tenantId);
  const amount = getString(body.amount);

  if (!leaseId || !tenantId || !amount) {
    return jsonError("Lease, tenant, and amount are required");
  }

  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, select: { depositAmount: true } });
  const amountNumber = Number(amount);
  const depositRequired = lease ? Number(lease.depositAmount ?? 0) : 0;
  const depositPaidBefore = (await paymentTotalsForLease(leaseId)).depositPaid;
  const split = allocatePayment({ amount: amountNumber, depositRequired, depositPaid: depositPaidBefore });

  const data: Record<string, unknown> = {
    leaseId,
    tenantId,
    amount,
    allocation: split.allocation,
    depositPortion: String(split.depositPortion),
    rentPortion: String(split.rentPortion),
    method: (body.method as PaymentMethod | undefined) ?? "CASH",
    status: (body.status as PaymentStatus | undefined) ?? "CONFIRMED",
    notes: getString(body.notes) || null,
  };

  if (body.receivedAt) {
    data.receivedAt = new Date(body.receivedAt);
  }

  if (body.reference !== undefined) {
    data.reference = getString(body.reference) || null;
  }

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data,
  });

  return NextResponse.json({ payment });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  if (auth.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete payments" }, { status: 403 });
  }

  const { paymentId } = await params;

  await prisma.payment.delete({ where: { id: paymentId } });

  return NextResponse.json({ ok: true });
}
