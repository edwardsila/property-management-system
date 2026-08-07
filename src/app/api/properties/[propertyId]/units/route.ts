import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { requireAdmin } from "@/lib/auth";
import { stkAccountReference } from "@/lib/daraja";
import { normalizeAccountRef } from "@/lib/reconcile";

type UnitStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { propertyId } = await params;
  const units = await prisma.unit.findMany({
    where: { propertyId },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ units });
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { propertyId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const unitName = getString(body.unitName);

  if (!unitName) {
    return jsonError("Unit name is required");
  }

  const unitCode = getString(body.unitCode);
  const providedRef = normalizeAccountRef(getString(body.paymentAccountRef));

  const unit = await prisma.unit.create({
    data: {
      propertyId,
      floorId: body.floorId ? String(body.floorId) : null,
      unitTypeId: body.unitTypeId ? String(body.unitTypeId) : null,
      unitName,
      unitCode: unitCode || null,
      paymentAccountRef: providedRef || (unitCode ? normalizeAccountRef(unitCode) : stkAccountReference(unitName)),
      status: (body.status as UnitStatus | undefined) ?? "VACANT",
      rentAmount: body.rentAmount ? String(body.rentAmount) : null,
      depositAmount: body.depositAmount ? String(body.depositAmount) : null,
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ unit }, { status: 201 });
}
