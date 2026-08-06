import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireTenant } from "@/lib/tenant-auth";
import { parseKenyanPhone } from "@/lib/phone";
import { stkAccountReference, stkPush } from "@/lib/daraja";

async function findActiveLease(tenantId: string) {
  const active = await prisma.lease.findFirst({
    where: { tenantId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    include: { unit: { select: { unitName: true, unitCode: true } } },
  });

  if (active) {
    return active;
  }

  return prisma.lease.findFirst({
    where: { tenantId },
    orderBy: { startDate: "desc" },
    include: { unit: { select: { unitName: true, unitCode: true } } },
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

  const result = await stkPush({
    phone,
    amount: Math.round(amount),
    accountReference: stkAccountReference(lease.unit?.unitName),
    transactionDesc: `Rent ${lease.unit?.unitCode ?? lease.unit?.unitName ?? "payment"}`.slice(0, 13),
  });

  if (!result.ok) {
    return jsonError(result.error, 502);
  }

  return NextResponse.json({
    ok: true,
    checkoutRequestId: result.checkoutRequestId,
    merchantRequestId: result.merchantRequestId,
    message: result.customerMessage ?? "Check your phone and enter your M-Pesa PIN to approve the payment.",
  });
}
