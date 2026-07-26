import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "../../../_shared";

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
    return digits.slice(-9);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits.slice(-9);
}

function readCallbackMetadata(metadata: unknown) {
  if (!Array.isArray(metadata)) {
    return {} as DarajaPayload;
  }

  return metadata.reduce<DarajaPayload>((accumulator, item) => {
    if (item && typeof item === "object") {
      const record = item as DarajaPayload;
      const name = readString(record.Name);

      if (name) {
        accumulator[name] = record.Value;
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
    return NextResponse.json({ ok: true, matched: false, reason: "Daraja callback reported a non-success result" });
  }

  if (!payload.transactionId || !Number.isFinite(payload.amount) || !payload.phoneNumber) {
    return jsonError("Daraja callback is missing transaction, amount, or phone data");
  }

  const normalizedPhone = normalizePhone(payload.phoneNumber);

  if (!normalizedPhone) {
    return jsonError("Unable to normalize phone number from Daraja callback");
  }

  const tenants = await prisma.tenant.findMany({
    where: payload.propertyId ? { propertyId: payload.propertyId } : undefined,
    select: { id: true, propertyId: true, phone: true, fullName: true },
  });

  const matchedTenant = tenants.find((tenant) => normalizePhone(tenant.phone) === normalizedPhone) ?? null;

  if (!matchedTenant) {
    return NextResponse.json(
      {
        ok: true,
        matched: false,
        reason: "No tenant matched the callback phone number",
        transactionId: payload.transactionId,
        reference: payload.reference || null,
      },
      { status: 202 },
    );
  }

  const lease =
    (await prisma.lease.findFirst({
      where: { tenantId: matchedTenant.id, propertyId: matchedTenant.propertyId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    })) ??
    (await prisma.lease.findFirst({
      where: { tenantId: matchedTenant.id, propertyId: matchedTenant.propertyId },
      orderBy: { createdAt: "desc" },
    }));

  if (!lease) {
    return NextResponse.json(
      {
        ok: true,
        matched: false,
        reason: "Tenant does not have a lease to attach the payment to",
        tenantId: matchedTenant.id,
        transactionId: payload.transactionId,
      },
      { status: 202 },
    );
  }

  const duplicate = await prisma.payment.findFirst({
    where: {
      OR: [{ reference: payload.transactionId }, { reference: payload.reference || undefined }].filter((item) => Boolean(item.reference)) as Array<{ reference: string }>,
    },
  });

  if (duplicate) {
    return NextResponse.json({ ok: true, matched: true, duplicate: true, paymentId: duplicate.id, tenantId: matchedTenant.id, leaseId: lease.id });
  }

  const payment = await prisma.payment.create({
    data: {
      propertyId: matchedTenant.propertyId,
      leaseId: lease.id,
      tenantId: matchedTenant.id,
      amount: payload.amount.toString(),
      method: "MPESA",
      status: "CONFIRMED",
      reference: payload.reference || payload.transactionId,
      receivedAt: payload.receivedAt ? new Date(payload.receivedAt) : new Date(),
      notes: payload.notes || `Auto-reconciled from Daraja for ${matchedTenant.fullName}`,
    },
  });

  return NextResponse.json({
    ok: true,
    matched: true,
    payment,
    tenantId: matchedTenant.id,
    leaseId: lease.id,
    transactionId: payload.transactionId,
  }, { status: 201 });
}
