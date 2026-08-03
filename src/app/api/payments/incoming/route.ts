import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "../../_shared";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";
import { createIncomingPayment } from "@/lib/reconcile";

type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";
type IncomingStatus = "UNMATCHED" | "MATCHED" | "DISCARDED";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(getString(value));

  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function serializeIncoming(incoming: {
  id: string;
  propertyId: string | null;
  tenantId: string | null;
  leaseId: string | null;
  amount: unknown;
  method: PaymentMethod;
  source: string;
  phone: string;
  reference: string | null;
  transactionId: string | null;
  receivedAt: Date;
  status: IncomingStatus;
  matchNote: string | null;
  notes: string | null;
  matchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...incoming,
    amount: String(incoming.amount),
    receivedAt: incoming.receivedAt.toISOString(),
    matchedAt: incoming.matchedAt ? incoming.matchedAt.toISOString() : null,
    createdAt: incoming.createdAt.toISOString(),
    updatedAt: incoming.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const propertyId = getString(url.searchParams.get("propertyId"));
  const status = getString(url.searchParams.get("status")) as IncomingStatus | "";

  const incoming = await prisma.incomingPayment.findMany({
    where: {
      ...(propertyId ? { propertyId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ status: "asc" }, { receivedAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ incoming: incoming.map(serializeIncoming) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const phoneRaw = getString(body.phone);

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const amount = getNumber(body.amount);

  if (!Number.isFinite(amount)) {
    return jsonError("Enter a valid payment amount");
  }

  const method = (body.method as PaymentMethod | undefined) ?? "MPESA";

  if (!["CASH", "BANK", "MPESA", "OTHER"].includes(method)) {
    return jsonError("Invalid payment method");
  }

  const result = await createIncomingPayment({
    propertyId: getString(body.propertyId) || null,
    amount,
    method,
    phone: parseKenyanPhone(phoneRaw) as string,
    reference: getString(body.reference) || null,
    transactionId: getString(body.transactionId) || null,
    source: "MANUAL",
    notes: getString(body.notes) || null,
  });

  return NextResponse.json(
    {
      ...result,
      incoming: result.incoming ? serializeIncoming(result.incoming) : null,
      payment: result.payment
        ? { ...result.payment, amount: String(result.payment.amount), receivedAt: result.payment.receivedAt.toISOString() }
        : null,
      message: result.message
        ? {
            id: result.message.id,
            status: result.message.status,
            error: result.message.error ?? null,
            sentAt: result.message.sentAt?.toISOString() ?? null,
          }
        : null,
    },
    { status: result.matched ? 201 : 202 },
  );
}
