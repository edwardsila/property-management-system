import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError, parseSortOrder } from "../../_shared";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: Request, { params }: { params: Promise<{ floorId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { floorId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const label = getString(body.label);
  const notes = getString(body.notes);

  const floor = await prisma.floor.update({
    where: { id: floorId },
    data: {
      label,
      sortOrder: parseSortOrder(body.sortOrder),
      notes: notes || null,
    },
  });

  return NextResponse.json({ floor });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ floorId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { floorId } = await params;

  await prisma.floor.delete({ where: { id: floorId } });

  return NextResponse.json({ ok: true });
}
