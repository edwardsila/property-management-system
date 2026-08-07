import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireAdmin } from "@/lib/auth";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { userId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });

  if (!existing || existing.role !== "AGENT_CARETAKER") {
    return jsonError("Agent not found", 404);
  }

  const name = getString(body.name);
  const phoneRaw = getString(body.phone);
  const propertyIds = Array.isArray(body.propertyIds) ? body.propertyIds.map(String) : [];

  if (!name) {
    return jsonError("Agent name is required");
  }

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;

  const phoneTaken = await prisma.user.findFirst({
    where: { phone, role: "AGENT_CARETAKER", id: { not: userId } },
  });

  if (phoneTaken) {
    return jsonError("Another agent already uses this phone number.", 409);
  }

  if (propertyIds.length > 0) {
    const count = await prisma.property.count({ where: { id: { in: propertyIds } } });

    if (count !== propertyIds.length) {
      return jsonError("One or more selected properties do not exist.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, phone },
  });

  await prisma.property.updateMany({
    where: { managerId: userId },
    data: { managerId: null },
  });

  if (propertyIds.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: propertyIds } },
      data: { managerId: userId },
    });
  }

  return NextResponse.json({
    staff: {
      id: userId,
      name,
      email: existing.email,
      phone,
      createdAt: existing.createdAt.toISOString(),
      managedPropertyIds: propertyIds,
    },
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { userId } = await params;
  const existing = await prisma.user.findUnique({ where: { id: userId } });

  if (!existing || existing.role !== "AGENT_CARETAKER") {
    return jsonError("Agent not found", 404);
  }

  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
