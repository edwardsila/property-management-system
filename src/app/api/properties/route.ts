import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../_shared";
import { ensureAdminUser, requireAdmin } from "@/lib/auth";

type PropertyType =
  | "APARTMENT_BLOCK"
  | "FLAT"
  | "BUNGALOW"
  | "SHOPPING_COMPLEX"
  | "MIXED_USE"
  | "OTHER";

export async function GET() {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const properties = await prisma.property.findMany({ orderBy: [{ createdAt: "asc" }] });
  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const name = getString(body.name);
  const slug = getString(body.slug) || name.toLowerCase().replace(/\s+/g, "-");
  const location = getString(body.location);
  const type = body.type as PropertyType | undefined;
  const notes = getString(body.notes);
  const paybillNumber = getString(body.paybillNumber);
  const paybillPasskey = getString(body.paybillPasskey);

  if (!name || !location) {
    return jsonError("Property name and location are required");
  }

  const owner = await ensureAdminUser();

  const property = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name,
      slug,
      type: type ?? "APARTMENT_BLOCK",
      location,
      notes: notes || null,
      paybillNumber: paybillNumber || null,
      paybillPasskey: paybillPasskey || null,
    },
  });

  return NextResponse.json({ property }, { status: 201 });
}
