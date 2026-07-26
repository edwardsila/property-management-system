import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";

export async function PATCH(request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const fullName = getString(body.fullName);
  const phone = getString(body.phone);

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      fullName,
      phone,
      email: getString(body.email) || null,
      nationalId: getString(body.nationalId) || null,
      nextOfKinName: getString(body.nextOfKinName) || null,
      nextOfKinPhone: getString(body.nextOfKinPhone) || null,
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ tenant });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;

  await prisma.tenant.delete({ where: { id: tenantId } });

  return NextResponse.json({ ok: true });
}
