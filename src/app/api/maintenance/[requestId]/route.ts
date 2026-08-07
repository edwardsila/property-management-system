import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireStaff } from "@/lib/auth";
import { requireStaffForProperty } from "@/lib/auth";

type MaintenanceStatus = "OPEN" | "IN_PROGRESS" | "AWAITING_APPROVAL" | "RESOLVED" | "CLOSED";

const RESOLVED_STATUSES = new Set(["RESOLVED", "CLOSED"]);

function clampPriority(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(5, Math.max(1, Math.round(parsed)));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { requestId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const existing = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });

  if (!existing) {
    return jsonError("Maintenance request not found", 404);
  }

  const scopeError = await requireStaffForProperty(auth.user.id, auth.user.role, existing.propertyId);

  if (scopeError) {
    return scopeError;
  }

  const status = getString(body.status);
  const priority = clampPriority(body.priority);
  const title = getString(body.title);

  const data: Record<string, unknown> = {};

  if (title) {
    data.title = title;
  }

  if (body.description !== undefined) {
    data.description = getString(body.description) || existing.description;
  }

  if (status) {
    data.status = status as MaintenanceStatus;
  }

  if (priority !== null) {
    data.priority = priority;
  }

  if (body.unitId !== undefined) {
    data.unitId = getString(body.unitId) || null;
  }

  if (body.tenantId !== undefined) {
    data.tenantId = getString(body.tenantId) || null;
  }

  if (body.assignedTo !== undefined) {
    data.assignedTo = getString(body.assignedTo) || null;
  }

  if (status && RESOLVED_STATUSES.has(status) && !existing.resolvedAt) {
    data.resolvedAt = new Date();
  } else if (status && !RESOLVED_STATUSES.has(status) && existing.resolvedAt) {
    data.resolvedAt = null;
  }

  const requestRecord = await prisma.maintenanceRequest.update({
    where: { id: requestId },
    data,
  });

  return NextResponse.json({ request: requestRecord });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await requireStaff();

  if (auth instanceof NextResponse) {
    return auth;
  }

  if (auth.user.role !== "OWNER") {
    return NextResponse.json({ error: "Only the owner can delete maintenance requests" }, { status: 403 });
  }

  const { requestId } = await params;
  const existing = await prisma.maintenanceRequest.findUnique({ where: { id: requestId } });

  if (!existing) {
    return jsonError("Maintenance request not found", 404);
  }

  await prisma.maintenanceRequest.delete({ where: { id: requestId } });

  return NextResponse.json({ ok: true });
}
