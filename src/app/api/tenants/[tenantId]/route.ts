import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireStaff } from "@/lib/auth";
import { requireStaffForProperty } from "@/lib/auth";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";
import { attachIncomingPaymentsByPhone } from "@/lib/reconcile";

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { tenantId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const existing = await prisma.tenant.findUnique({ where: { id: tenantId } });

  if (!existing) {
    return jsonError("Tenant not found", 404);
  }

  const scopeError = await requireStaffForProperty(auth.user.id, auth.user.role, existing.propertyId);

  if (scopeError) {
    return scopeError;
  }

  const fullName = getString(body.fullName);
  const phoneRaw = getString(body.phone);

  if (!fullName || !phoneRaw) {
    return jsonError("Tenant name and phone are required");
  }

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Phone must be a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;
  const nextOfKinPhoneRaw = getString(body.nextOfKinPhone);

  if (nextOfKinPhoneRaw && !isValidKenyanMobile(nextOfKinPhoneRaw)) {
    return jsonError("Next of kin phone must be a valid Kenyan mobile number");
  }

  const nextOfKinPhone = nextOfKinPhoneRaw ? (parseKenyanPhone(nextOfKinPhoneRaw) as string) : null;

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      fullName,
      phone,
      email: getString(body.email) || null,
      nationalId: getString(body.nationalId) || null,
      nextOfKinName: getString(body.nextOfKinName) || null,
      nextOfKinPhone,
      notes: getString(body.notes) || null,
    },
  });

  let attachedPayments = 0;

  if (phone !== existing.phone) {
    attachedPayments = await attachIncomingPaymentsByPhone({ tenantId: tenant.id, propertyId: tenant.propertyId, phone });
  }

  return NextResponse.json({ tenant, attachedPayments });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  if (auth.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete tenants" }, { status: 403 });
  }

  const { tenantId } = await params;

  await prisma.tenant.delete({ where: { id: tenantId } });

  return NextResponse.json({ ok: true });
}
