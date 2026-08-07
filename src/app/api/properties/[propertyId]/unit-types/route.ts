import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError, parseSortOrder } from "../../../_shared";
import { requireAdmin } from "@/lib/auth";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { propertyId } = await params;
  const unitTypes = await prisma.unitType.findMany({
    where: { propertyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ unitTypes });
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

  const name = getString(body.name);
  const description = getString(body.description);

  if (!name) {
    return jsonError("Unit type name is required");
  }

  const unitType = await prisma.unitType.create({
    data: {
      propertyId,
      name,
      description: description || null,
      defaultRent: body.defaultRent ? String(body.defaultRent) : null,
      defaultDeposit: body.defaultDeposit ? String(body.defaultDeposit) : null,
      sortOrder: parseSortOrder(body.sortOrder),
    },
  });

  return NextResponse.json({ unitType }, { status: 201 });
}
