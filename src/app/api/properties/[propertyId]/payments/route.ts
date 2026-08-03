import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { sendPaymentReceipt } from "@/lib/reconcile";

type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";
type PaymentStatus = "PENDING" | "CONFIRMED" | "REVERSED";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const payments = await prisma.payment.findMany({
    where: { propertyId },
    orderBy: [{ receivedAt: "desc" }],
  });

  return NextResponse.json({ payments });
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
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

  const payment = await prisma.payment.create({
    data: {
      propertyId,
      leaseId,
      tenantId,
      amount,
      method: (body.method as PaymentMethod | undefined) ?? "CASH",
      status,
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
      amount: Number(amount),
      reference: getString(body.reference) || null,
    });
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
