import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createIncomingPayment } from "@/lib/reconcile";
import { checkCallbackSecret, normalizePhone, parseDarajaTime, readNumber, readString } from "../_helpers";

type DarajaPayload = Record<string, unknown>;

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
    checkoutRequestId: readString(stkCallback?.CheckoutRequestID, body.CheckoutRequestID, body.checkoutRequestId),
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
  const secretError = checkCallbackSecret(request);

  if (secretError) {
    return secretError;
  }

  const body = (await request.json().catch(() => null)) as DarajaPayload | null;

  if (!body) {
    return NextResponse.json({ ok: true, matched: false, queued: false, reason: "Invalid JSON payload" });
  }

  const payload = extractDarajaFields(body);

  if (payload.resultCode !== 0) {
    if (payload.checkoutRequestId) {
      await prisma.pendingPayment.updateMany({
        where: { checkoutRequestId: payload.checkoutRequestId, status: "PENDING" },
        data: { status: "FAILED", error: `STK push rejected by Daraja (result code ${payload.resultCode})` },
      });
    }

    return NextResponse.json({ ok: true, matched: false, queued: false, reason: "Daraja callback reported a non-success result" });
  }

  if (!payload.transactionId || !Number.isFinite(payload.amount) || !payload.phoneNumber) {
    return NextResponse.json({ ok: true, matched: false, queued: false, reason: "Daraja callback is missing transaction, amount, or phone data" });
  }

  const normalizedPhone = normalizePhone(payload.phoneNumber);

  if (!normalizedPhone) {
    return NextResponse.json({ ok: true, matched: false, queued: false, reason: "Unable to normalize phone number from Daraja callback" });
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
    receivedAt: parseDarajaTime(payload.receivedAt),
    source: "DARAJ_A",
    notes: payload.notes || "Auto-reconciled from Daraja",
    checkoutRequestId: payload.checkoutRequestId || null,
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
