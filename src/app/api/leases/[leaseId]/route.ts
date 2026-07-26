import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";

type LeaseStatus = "DRAFT" | "ACTIVE" | "ENDED" | "TERMINATED";

export async function PATCH(request: Request, { params }: { params: Promise<{ leaseId: string }> }) {
  const { leaseId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const unitId = getString(body.unitId);
  const tenantId = getString(body.tenantId);
  const monthlyRent = getString(body.monthlyRent);

  const lease = await prisma.lease.update({
    where: { id: leaseId },
    data: {
      unitId,
      tenantId,
      status: (body.status as LeaseStatus | undefined) ?? "DRAFT",
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      moveInDate: body.moveInDate ? new Date(body.moveInDate) : null,
      moveOutDate: body.moveOutDate ? new Date(body.moveOutDate) : null,
      monthlyRent,
      depositAmount: getString(body.depositAmount) || null,
      graceDays: Number(body.graceDays || 0),
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ lease });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ leaseId: string }> }) {
  const { leaseId } = await params;

  await prisma.lease.delete({ where: { id: leaseId } });

  return NextResponse.json({ ok: true });
}
