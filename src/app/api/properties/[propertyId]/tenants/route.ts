import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

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
  const phoneRaw = getString(body.phone);

  if (!fullName || !phoneRaw) {
    return jsonError("Tenant name and phone are required");
  }

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Phone must be a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;
  const nextOfKinPhoneRaw = getString(body.nextOfKinPhone);

  if (nextOfKinPhoneRaw && !isValidKenyanMobile(nextOfKinPhoneRaw)) {
    return jsonError("Next of kin phone must be a valid Kenyan mobile number");
  }

  const nextOfKinPhone = nextOfKinPhoneRaw ? (parseKenyanPhone(nextOfKinPhoneRaw) as string) : null;

  const tenant = await prisma.tenant.create({
    data: {
      propertyId,
      fullName,
      phone,
      email: getString(body.email) || null,
      nationalId: getString(body.nationalId) || null,
      nextOfKinName: getString(body.nextOfKinName) || null,
      nextOfKinPhone,
      notes: getString(body.notes) || null,
    },
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
