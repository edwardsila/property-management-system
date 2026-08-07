import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createIncomingPayment } from "@/lib/reconcile";
import { checkCallbackSecret, extractC2BFields, normalizePhone, parseDarajaTime } from "../../_helpers";

export async function POST(request: Request) {
  const secretError = checkCallbackSecret(request);

  if (secretError) {
    return secretError;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" });
  }

  const fields = extractC2BFields(body);

  if (!fields.transactionId || !Number.isFinite(fields.amount) || fields.amount <= 0 || !fields.phone) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing transaction, amount, or phone data" });
  }

  const phone = normalizePhone(fields.phone);

  if (!phone) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unable to normalize phone number" });
  }

  try {
    const property = fields.shortcode
      ? await prisma.property.findFirst({ where: { paybillNumber: fields.shortcode }, select: { id: true } })
      : null;

    await createIncomingPayment({
      propertyId: property?.id ?? null,
      amount: fields.amount,
      method: "MPESA",
      phone,
      reference: fields.reference || null,
      transactionId: fields.transactionId,
      receivedAt: parseDarajaTime(fields.receivedAt),
      source: "DARAJ_C2B",
      notes: "Auto-reconciled from M-Pesa paybill (C2B)",
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (requestError) {
    console.error("Daraja C2B confirmation failed:", requestError);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Server error" });
  }
}
