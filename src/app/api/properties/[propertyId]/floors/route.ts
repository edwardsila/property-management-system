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
  const floors = await prisma.floor.findMany({
    where: { propertyId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ floors });
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

  const label = getString(body.label);
  const notes = getString(body.notes);

  if (!label) {
    return jsonError("Floor label is required");
  }

  const floor = await prisma.floor.create({
    data: {
      propertyId,
      label,
      sortOrder: parseSortOrder(body.sortOrder),
      notes: notes || null,
    },
  });

  return NextResponse.json({ floor }, { status: 201 });
}
