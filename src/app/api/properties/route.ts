import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../_shared";

type PropertyType =
  | "APARTMENT_BLOCK"
  | "FLAT"
  | "BUNGALOW"
  | "SHOPPING_COMPLEX"
  | "MIXED_USE"
  | "OTHER";

const bootstrapOwner = {
  name: "Default Owner",
  email: "owner@property.local",
  role: "OWNER",
} as const;

async function ensureOwner() {
  return prisma.user.upsert({
    where: { email: bootstrapOwner.email },
    update: {},
    create: bootstrapOwner,
  });
}

export async function GET() {
  const properties = await prisma.property.findMany({ orderBy: [{ createdAt: "asc" }] });
  return NextResponse.json({ properties });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const name = getString(body.name);
  const slug = getString(body.slug) || name.toLowerCase().replace(/\s+/g, "-");
  const location = getString(body.location);
  const type = body.type as PropertyType | undefined;
  const notes = getString(body.notes);

  if (!name || !location) {
    return jsonError("Property name and location are required");
  }

  const owner = await ensureOwner();

  const property = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name,
      slug,
      type: type ?? "APARTMENT_BLOCK",
      location,
      notes: notes || null,
    },
  });

  return NextResponse.json({ property }, { status: 201 });
}
