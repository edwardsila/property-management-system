import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../_shared";
import { requireAdmin } from "@/lib/auth";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

export async function GET() {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const staff = await prisma.user.findMany({
    where: { role: "AGENT_CARETAKER" },
    orderBy: [{ createdAt: "asc" }],
  });

  const managed = await prisma.property.findMany({
    where: { managerId: { in: staff.map((user) => user.id), not: null } },
    select: { id: true, managerId: true },
  });

  const managedByUser = new Map<string, string[]>();
  for (const property of managed) {
    if (property.managerId === null) {
      continue;
    }

    const list = managedByUser.get(property.managerId) ?? [];
    list.push(property.id);
    managedByUser.set(property.managerId, list);
  }

  return NextResponse.json({
    staff: staff.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt.toISOString(),
      managedPropertyIds: managedByUser.get(user.id) ?? [],
    })),
  });
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
  const phoneRaw = getString(body.phone);
  const propertyIds = Array.isArray(body.propertyIds) ? body.propertyIds.map(String) : [];

  if (!name) {
    return jsonError("Agent name is required");
  }

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;

  const existing = await prisma.user.findFirst({
    where: { phone, role: "AGENT_CARETAKER" },
  });

  if (existing) {
    return jsonError("An agent with this phone number already exists.", 409);
  }

  if (propertyIds.length > 0) {
    const count = await prisma.property.count({ where: { id: { in: propertyIds } } });

    if (count !== propertyIds.length) {
      return jsonError("One or more selected properties do not exist.");
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email: `agent-${phone}@terava.local`,
      role: "AGENT_CARETAKER",
    },
  });

  if (propertyIds.length > 0) {
    await prisma.property.updateMany({
      where: { id: { in: propertyIds } },
      data: { managerId: user.id },
    });
  }

  return NextResponse.json(
    {
      staff: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        createdAt: user.createdAt.toISOString(),
        managedPropertyIds: propertyIds,
      },
    },
    { status: 201 },
  );
}
