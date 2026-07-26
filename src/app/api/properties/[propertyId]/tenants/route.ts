import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";

export async function GET(_request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const tenants = await prisma.tenant.findMany({
    where: { propertyId },
    orderBy: [{ createdAt: "asc" }],
  });

  return NextResponse.json({ tenants });
}

export async function POST(request: Request, { params }: { params: Promise<{ propertyId: string }> }) {
  const { propertyId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const fullName = getString(body.fullName);
  const phone = getString(body.phone);

  if (!fullName || !phone) {
    return jsonError("Tenant name and phone are required");
  }

  const tenant = await prisma.tenant.create({
    data: {
      propertyId,
      fullName,
      phone,
      email: getString(body.email) || null,
      nationalId: getString(body.nationalId) || null,
      nextOfKinName: getString(body.nextOfKinName) || null,
      nextOfKinPhone: getString(body.nextOfKinPhone) || null,
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
