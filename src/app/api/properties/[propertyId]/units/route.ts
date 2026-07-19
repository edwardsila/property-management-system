import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";

type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const units = await prisma.unit.findMany({
    where: { propertyId },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ units });
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const unitName = getString(body.unitName);

  if (!unitName) {
    return jsonError("Unit name is required");
  }

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      floorId: body.floorId ? String(body.floorId) : null,
      unitTypeId: body.unitTypeId ? String(body.unitTypeId) : null,
      unitName,
      unitCode: getString(body.unitCode) || null,
      status: (body.status as UnitStatus | undefined) ?? "VACANT",
      rentAmount: body.rentAmount ? String(body.rentAmount) : null,
      depositAmount: body.depositAmount ? String(body.depositAmount) : null,
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ unit }, { status: 201 });
}
