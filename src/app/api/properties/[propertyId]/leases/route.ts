import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";

type LeaseStatus = "DRAFT" | "ACTIVE" | "ENDED" | "TERMINATED";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const leases = await prisma.lease.findMany({
    where: { propertyId },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ leases });
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const unitId = getString(body.unitId);
  const tenantId = getString(body.tenantId);
  const monthlyRent = getString(body.monthlyRent);

  if (!unitId || !tenantId || !monthlyRent) {
    return jsonError("Unit, tenant, and monthly rent are required");
  }

  const lease = await prisma.lease.create({
    data: {
      propertyId,
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

  return NextResponse.json({ lease }, { status: 201 });
}
