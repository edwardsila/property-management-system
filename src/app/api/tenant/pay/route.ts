import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireTenant } from "@/lib/tenant-auth";
import { parseKenyanPhone } from "@/lib/phone";
import { stkAccountReference, stkPush } from "@/lib/daraja";
import { normalizeAccountRef } from "@/lib/reconcile";

const PENDING_PUSH_TTL_MS = 10 * 60 * 1000;

async function findActiveLease(tenantId: string) {
  const active = await prisma.lease.findFirst({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    include: {
      unit: { select: { id: true, unitName: true, unitCode: true, paymentAccountRef: true } },
      property: { select: { paybillNumber: true, paybillPasskey: true } },
    },
  });

  if (active) {
    return active;
  }

  return prisma.lease.findFirst({
    where: { tenantId },
    orderBy: { startDate: "desc" },
    include: {
      unit: { select: { id: true, unitName: true, unitCode: true, paymentAccountRef: true } },
      property: { select: { paybillNumber: true, paybillPasskey: true } },
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireTenant();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { tenant } = auth;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const amount = Number(getString(body.amount));

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("Enter a valid payment amount");
  }

  const lease = await findActiveLease(tenant.id);

  if (!lease) {
    return jsonError("No lease was found to attach this payment to. Contact the property office.", 404);
  }

  const phone = parseKenyanPhone(tenant.phone);

  if (!phone) {
    return jsonError("Your registered phone number is not a valid Kenyan mobile number.");
  }

  const accountReference = normalizeAccountRef(lease.unit?.paymentAccountRef) || stkAccountReference(lease.unit?.unitName);
  const shortcode = lease.property?.paybillNumber?.trim() || undefined;
  const passkey = lease.property?.paybillPasskey?.trim() || undefined;

  const pending = await prisma.pendingPayment.create({
    data: {
      propertyId: lease.propertyId,
      leaseId: lease.id,
      unitId: lease.unit?.id ?? null,
      tenantId: tenant.id,
      phone,
      amount: String(Math.round(amount)),
      accountReference,
      expiresAt: new Date(Date.now() + PENDING_PUSH_TTL_MS),
      status: "PENDING",
    },
  });

  const result = await stkPush({
    phone,
    amount: Math.round(amount),
    accountReference,
    shortcode,
    passkey,
    transactionDesc: `Rent ${lease.unit?.unitCode ?? lease.unit?.unitName ?? "payment"}`.slice(0, 13),
  });

  if (!result.ok) {
    await prisma.pendingPayment.update({
      where: { id: pending.id },
      data: { status: "FAILED", error: result.error },
    });

    return jsonError(result.error, 502);
  }

  await prisma.pendingPayment.update({
    where: { id: pending.id },
    data: { checkoutRequestId: result.checkoutRequestId, merchantRequestId: result.merchantRequestId },
  });

  return NextResponse.json({
    ok: true,
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    message: result.customerMessage ?? "Check your phone and enter your M-Pesa PIN to approve the payment.",
  });
}
