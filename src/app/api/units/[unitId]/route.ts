import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";

type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export async function PATCH(request: Request, { params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const unitName = getString(body.unitName);

  const unit = await prisma.unit.update({
    where: { id: unitId },
    data: {
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

  return NextResponse.json({ unit });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;

  await prisma.unit.delete({ where: { id: unitId } });

  return NextResponse.json({ ok: true });
}
