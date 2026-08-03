import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "../../../_shared";
import { createIncomingPayment } from "@/lib/reconcile";

type DarajaPayload = Record<string, unknown>;

function readString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

function readNumber(...values: Array<unknown>) {
  for (const value of values) {
    const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("254")) {
    return `254${digits.slice(3)}`;
  }

  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  return `254${digits.slice(-9)}`;
}

function readCallbackMetadata(metadata: unknown) {
  let items: unknown = metadata;

  if (metadata && typeof metadata === "object") {
    const wrapped = metadata as DarajaPayload;
    const itemValue = wrapped.Item ?? wrapped.item;

    if (Array.isArray(itemValue)) {
      items = itemValue;
    }
  }

  if (!Array.isArray(items)) {
    return {} as DarajaPayload;
  }

  return items.reduce<DarajaPayload>((accumulator, item) => {
    if (item && typeof item === "object") {
      const record = item as DarajaPayload;
      const name = readString(record.Name, record.name);

      if (name) {
        accumulator[name] = record.Value ?? record.value;
      }
    }

    return accumulator;
  }, {});
}

function extractDarajaFields(body: DarajaPayload) {
  const stkCallback = (body.Body as DarajaPayload | undefined)?.stkCallback as DarajaPayload | undefined;
  const callbackData = stkCallback ? readCallbackMetadata(stkCallback.CallbackMetadata) : {};

  return {
    resultCode: readNumber(stkCallback?.ResultCode, body.ResultCode),
    transactionId: readString(
      callbackData.MpesaReceiptNumber,
      body.MpesaReceiptNumber,
      body.TransID,
      body.TransactionId,
      body.TransactionID,
      body.checkoutRequestId,
      body.CheckoutRequestID,
    ),
    reference: readString(
      callbackData.BillRefNumber,
      body.BillRefNumber,
      body.AccountReference,
      body.reference,
      body.Reference,
      body.checkoutRequestId,
    ),
    phoneNumber: readString(
      callbackData.PhoneNumber,
      body.PhoneNumber,
      body.MSISDN,
      body.msisdn,
      body.phoneNumber,
      body.Phone,
    ),
    amount: readNumber(callbackData.Amount, body.Amount, body.TransAmount),
    receivedAt: readString(body.TransTime, body.TransactionDate, body.receivedAt),
    propertyId: readString(body.propertyId, body.PropertyId, body.propertyID),
    notes: readString(body.notes, body.Note, body.Remarks),
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DarajaPayload | null;

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const payload = extractDarajaFields(body);

  if (payload.resultCode !== 0) {
    return NextResponse.json({ ok: true, matched: false, queued: false, reason: "Daraja callback reported a non-success result" });
  }

  if (!payload.transactionId || !Number.isFinite(payload.amount) || !payload.phoneNumber) {
    return jsonError("Daraja callback is missing transaction, amount, or phone data");
  }

  const normalizedPhone = normalizePhone(payload.phoneNumber);

  if (!normalizedPhone) {
    return jsonError("Unable to normalize phone number from Daraja callback");
  }

  const existing = await prisma.payment.findFirst({
    where: { OR: [{ reference: payload.transactionId }, ...(payload.reference ? [{ reference: payload.reference }] : [])] },
  });

  if (existing) {
    return NextResponse.json({ ok: true, matched: true, duplicate: true, paymentId: existing.id, tenantId: existing.tenantId, leaseId: existing.leaseId });
  }

  const result = await createIncomingPayment({
    propertyId: payload.propertyId || null,
    amount: payload.amount,
    method: "MPESA",
    phone: normalizedPhone,
    reference: payload.reference || null,
    transactionId: payload.transactionId,
    receivedAt: payload.receivedAt ? new Date(payload.receivedAt) : new Date(),
    source: "DARAJ_A",
    notes: payload.notes || "Auto-reconciled from Daraja",
  });

  if (result.duplicate) {
    const payment = result.incoming
      ? null
      : await prisma.payment.findFirst({
          where: { OR: [{ reference: payload.transactionId }, ...(payload.reference ? [{ reference: payload.reference }] : [])] },
        });

    return NextResponse.json({
      ok: true,
      matched: !!payment || result.matched,
      duplicate: true,
      queued: !result.matched,
      reason: result.reason ?? "Duplicate transaction reference",
      paymentId: payment?.id ?? null,
      tenantId: payment?.tenantId ?? null,
      leaseId: payment?.leaseId ?? null,
      transactionId: payload.transactionId,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      matched: result.matched,
      queued: !result.matched,
      reason: result.reason,
      transactionId: payload.transactionId,
      paymentId: result.payment?.id ?? null,
      tenantId: result.payment?.tenantId ?? null,
      leaseId: result.payment?.leaseId ?? null,
      incomingId: result.incoming?.id ?? null,
      message: result.message
        ? {
            id: result.message.id,
            status: result.message.status,
            error: result.message.error ?? null,
          }
        : null,
    },
    { status: result.matched ? 201 : 202 },
  );
}
