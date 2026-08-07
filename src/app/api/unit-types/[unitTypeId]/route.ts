import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError, parseSortOrder } from "../../_shared";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ unitTypeId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { unitTypeId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const name = getString(body.name);
  const description = getString(body.description);

  const unitType = await prisma.unitType.update({
    where: { id: unitTypeId },
    data: {
      name,
      description: description || null,
      defaultRent: body.defaultRent ? String(body.defaultRent) : null,
      defaultDeposit: body.defaultDeposit ? String(body.defaultDeposit) : null,
      sortOrder: parseSortOrder(body.sortOrder),
    },
  });

  return NextResponse.json({ unitType });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ unitTypeId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { unitTypeId } = await params;

  await prisma.unitType.delete({ where: { id: unitTypeId } });

  return NextResponse.json({ ok: true });
}
