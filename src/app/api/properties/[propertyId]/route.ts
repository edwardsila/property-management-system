import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";

type PropertyType =
  | "APARTMENT_BLOCK"
  | "FLAT"
  | "BUNGALOW"
  | "SHOPPING_COMPLEX"
  | "MIXED_USE"
  | "OTHER";

export async function PATCH(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const name = getString(body.name);
  const slug = getString(body.slug) || name.toLowerCase().replace(/\s+/g, "-");
  const location = getString(body.location);
  const notes = getString(body.notes);
  const type = body.type as PropertyType | undefined;

  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      name,
      slug,
      type: type ?? undefined,
      location,
      notes: notes || null,
    },
  });

  return NextResponse.json({ property });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;

  await prisma.property.delete({
    where: { id: propertyId },
  });

  return NextResponse.json({ ok: true });
}
