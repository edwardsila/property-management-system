import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";

type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";
type PaymentStatus = "PENDING" | "CONFIRMED" | "REVERSED";

export async function PATCH(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const leaseId = getString(body.leaseId);
  const tenantId = getString(body.tenantId);
  const amount = getString(body.amount);

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      leaseId,
      tenantId,
      amount,
      method: (body.method as PaymentMethod | undefined) ?? "CASH",
      status: (body.status as PaymentStatus | undefined) ?? "CONFIRMED",
      reference: getString(body.reference) || null,
      receivedAt: body.receivedAt ? new Date(body.receivedAt) : new Date(),
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ payment });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;

  await prisma.payment.delete({ where: { id: paymentId } });

  return NextResponse.json({ ok: true });
}
