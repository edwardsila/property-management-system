import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "../_shared";
import { requireAdmin } from "@/lib/auth";
import { composeMessageBody, composeMessageSubject, deliverMessage } from "@/lib/messaging";
import { leaseBalance, nextRentDueDate } from "@/lib/rental";

type MessageType = "RENT_DUE" | "BALANCE" | "PAYMENT_RECEIVED" | "MANUAL";
type MessageChannel = "SMS" | "EMAIL";

const messageTypes: MessageType[] = ["RENT_DUE", "BALANCE", "PAYMENT_RECEIVED", "MANUAL"];
const channels: MessageChannel[] = ["SMS", "EMAIL"];

export async function GET(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get("propertyId") ?? "";

  const messages = await prisma.message.findMany({
    where: propertyId ? { propertyId } : undefined,
    orderBy: [{ createdAt: "desc" }],
    take: 100,
    include: { tenant: { select: { id: true, fullName: true, phone: true } } },
  });

  return NextResponse.json({
    messages: messages.map((message) => ({
      ...message,
      sentAt: message.sentAt ? message.sentAt.toISOString() : null,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
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

  const propertyId = typeof body.propertyId === "string" ? body.propertyId.trim() : "";
  const type = body.type as MessageType;
  const channel = body.channel as MessageChannel;
  const recipients = body.recipients as "ALL_TENANTS" | "IN_ARREARS" | "SPECIFIC";
  const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
  const customBody = typeof body.body === "string" ? body.body.trim() : "";

  if (!propertyId || !messageTypes.includes(type) || !channels.includes(channel)) {
    return jsonError("Property, message type, and channel are required");
  }

  if (!["ALL_TENANTS", "IN_ARREARS", "SPECIFIC"].includes(recipients)) {
    return jsonError("Invalid recipients selection");
  }

  if (recipients === "SPECIFIC" && !tenantId) {
    return jsonError("Select a tenant to message");
  }

  if (type === "MANUAL" && !customBody) {
    return jsonError("Message text is required for manual messages");
  }

  const property = await prisma.property.findUnique({ where: { id: propertyId } });

  if (!property) {
    return jsonError("Property not found", 404);
  }

  const tenants = await prisma.tenant.findMany({
    where: recipients === "SPECIFIC" ? { id: tenantId, propertyId } : { propertyId },
    include: {
      leases: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const now = new Date();
  const created: Array<Record<string, unknown>> = [];

  for (const tenant of tenants) {
    const lease = tenant.leases[0];
    const unit = lease
      ? await prisma.unit.findUnique({ where: { id: lease.unitId }, select: { unitName: true } })
      : null;

    const paid = lease
      ? (await prisma.payment.aggregate({
          where: { leaseId: lease.id, status: "CONFIRMED" },
          _sum: { rentPortion: true },
        }))._sum.rentPortion ?? 0
      : 0;

    const balance = lease ? leaseBalance(lease, Number(paid), now).balance : 0;
    const dueDate = lease ? nextRentDueDate(lease.startDate, lease.graceDays, now) : now;

    const content = composeMessageBody(type, {
      tenantName: tenant.fullName,
      unitName: unit?.unitName ?? null,
      monthlyRent: lease ? Number(lease.monthlyRent) : 0,
      balance,
      dueDate,
      customBody,
    });

    if (type !== "MANUAL" && !lease) {
      continue;
    }

    const message = await prisma.message.create({
      data: {
        propertyId,
        tenantId: tenant.id,
        leaseId: lease?.id ?? null,
        type,
        channel,
        subject: channel === "EMAIL" ? composeMessageSubject(type) || customBody.slice(0, 80) || null : null,
        body: content,
        status: "QUEUED",
      },
    });

    await deliverMessage(message.id);

    const delivered = await prisma.message.findUnique({ where: { id: message.id } });

    created.push({
      id: message.id,
      tenantId: tenant.id,
      leaseId: lease?.id ?? null,
      type: message.type,
      channel: message.channel,
      provider: delivered?.provider ?? null,
      body: content,
      status: delivered?.status ?? message.status,
      error: delivered?.error ?? null,
      sentAt: delivered?.sentAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    });
  }

  return NextResponse.json(
    {
      ok: true,
      count: created.length,
      recipients: tenants.length,
      messages: created,
    },
    { status: 201 },
  );
}
