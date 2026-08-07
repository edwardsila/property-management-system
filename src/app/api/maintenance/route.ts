import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../_shared";
import { requireStaff } from "@/lib/auth";
import { requireStaffForProperty } from "@/lib/auth";

type MaintenanceStatus = "OPEN" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "RESOLVED" | "CLOSED";

function clampPriority(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 2;
  }

  return Math.min(5, Math.max(1, Math.round(parsed)));
}

export async function GET(request: Request) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const propertyId = new URL(request.url).searchParams.get("propertyId");
  const where = propertyId
    ? { propertyId, ...(auth.user.role === "AGENT_CARETAKER" ? { property: { managerId: auth.user.id } } : {}) }
    : auth.user.role === "AGENT_CARETAKER"
      ? { property: { managerId: auth.user.id } }
      : undefined;

  const requests = await prisma.maintenanceRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const propertyId = getString(body.propertyId);
  const title = getString(body.title);
  const description = getString(body.description);
  const status = body.status as MaintenanceStatus | undefined;

  if (!propertyId) {
    return jsonError("Select a property workspace first");
  }

  const scopeError = await requireStaffForProperty(auth.user.id, auth.user.role, propertyId);

  if (scopeError) {
    return scopeError;
  }

  if (!title) {
    return jsonError("Enter a short title for the maintenance request");
  }

  const requestRecord = await prisma.maintenanceRequest.create({
    data: {
      propertyId,
      title,
      description: description || title,
      unitId: getString(body.unitId) || null,
      tenantId: getString(body.tenantId) || null,
      status: status ?? "OPEN",
      priority: clampPriority(body.priority),
      assignedTo: getString(body.assignedTo) || null,
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });

  return NextResponse.json({ request: requestRecord }, { status: 201 });
}
