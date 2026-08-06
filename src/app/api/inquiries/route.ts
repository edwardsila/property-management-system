import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../_shared";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const propertyId = new URL(request.url).searchParams.get("propertyId");
  const inquiries = await prisma.inquiry.findMany({
    where: propertyId ? { propertyId } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ inquiries });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const fullName = getString(body.fullName);
  const phone = getString(body.phone);
  const message = getString(body.message);
  const email = getString(body.email);

  if (!fullName) {
    return jsonError("Enter your full name");
  }

  if (!phone || phone.length < 7) {
    return jsonError("Enter a valid phone number");
  }

  if (!message) {
    return jsonError("Tell us how we can help");
  }

  const requestedPropertyId = getString(body.propertyId);
  const property =
    (requestedPropertyId
      ? await prisma.property.findUnique({ where: { id: requestedPropertyId } })
      : null) ??
    (await prisma.property.findFirst({ orderBy: [{ createdAt: "asc" }] }));

  if (!property) {
    return jsonError("No property workspace is set up yet. Please contact us directly.", 503);
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      propertyId: property.id,
      fullName,
      phone,
      email: email || null,
      message,
    },
  });

  return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
}
