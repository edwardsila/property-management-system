import { prisma } from "@/lib/prisma";
import { parseKenyanPhone } from "@/lib/phone";
import { composeMessageBody, deliverMessage } from "@/lib/messaging";

export type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";

export type IncomingInput = {
  propertyId?: string | null;
  amount: string | number;
  method?: PaymentMethod;
  phone: string;
  reference?: string | null;
  transactionId?: string | null;
  receivedAt?: Date;
  source?: string;
  notes?: string | null;
};

type AutoMatchResult = {
  tenant: { id: string; propertyId: string; fullName: string } | null;
  lease: { id: string; propertyId: string } | null;
  reason: string | null;
};

async function findBestLease(tenantId: string, propertyId: string) {
  const active = await prisma.lease.findFirst({
    where: { tenantId, propertyId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  if (active) {
    return active;
  }

  return prisma.lease.findFirst({
    where: { tenantId, propertyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function autoMatch({ phone, propertyId }: { phone: string; propertyId?: string | null }): Promise<AutoMatchResult> {
  const normalized = parseKenyanPhone(phone);

  if (!normalized) {
    return { tenant: null, lease: null, reason: "The payment phone number is not a valid Kenyan mobile number." };
  }

  const tenants = await prisma.tenant.findMany({
    where: propertyId ? { propertyId } : undefined,
    select: { id: true, propertyId: true, phone: true, fullName: true },
  });

  const matches = tenants.filter((tenant) => parseKenyanPhone(tenant.phone) === normalized);

  if (matches.length === 0) {
    return { tenant: null, lease: null, reason: "No tenant matched the payment phone number." };
  }

  if (matches.length > 1) {
    return { tenant: null, lease: null, reason: "Multiple tenants share this phone number. Confirm manually." };
  }

  const tenant = matches[0];
  const lease = await findBestLease(tenant.id, tenant.propertyId);

  if (!lease) {
    return { tenant, lease: null, reason: "Tenant matched but has no lease to attach the payment to." };
  }

  return { tenant, lease, reason: null };
}

export async function sendPaymentReceipt({
  leaseId,
  tenantId,
  amount,
  reference,
}: {
  leaseId: string;
  tenantId: string;
  amount: number;
  reference?: string | null;
}) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: { tenant: { select: { fullName: true } }, unit: { select: { unitName: true } } },
  });

  if (!lease) {
    return null;
  }

  const body = composeMessageBody("PAYMENT_RECEIVED", {
    tenantName: lease.tenant.fullName,
    unitName: lease.unit?.unitName ?? null,
    monthlyRent: Number(lease.monthlyRent),
    balance: 0,
    dueDate: new Date(),
    amount,
  });

  const message = await prisma.message.create({
    data: {
      propertyId: lease.propertyId,
      tenantId,
      leaseId,
      type: "PAYMENT_RECEIVED",
      channel: "SMS",
      subject: reference ? `Receipt ${reference}` : null,
      body,
      status: "QUEUED",
    },
  });

  return deliverMessage(message.id);
}

export async function recordPayment({
  propertyId,
  tenantId,
  leaseId,
  amount,
  method,
  reference,
  receivedAt,
  notes,
  sendSms = true,
}: {
  propertyId: string;
  tenantId: string;
  leaseId: string;
  amount: string | number;
  method?: PaymentMethod;
  reference?: string | null;
  receivedAt?: Date;
  notes?: string | null;
  sendSms?: boolean;
}) {
  const payment = await prisma.payment.create({
    data: {
      propertyId,
      leaseId,
      tenantId,
      amount: String(amount),
      method: method ?? "MPESA",
      status: "CONFIRMED",
      reference: reference || null,
      receivedAt: receivedAt ?? new Date(),
      notes: notes || null,
    },
  });

  let message = null;

  if (sendSms) {
    message = await sendPaymentReceipt({
      leaseId,
      tenantId,
      amount: Number(amount),
      reference: reference || null,
    });
  }

  return { payment, message };
}

async function findDuplicate(input: IncomingInput) {
  const references: Array<{ transactionId?: string; reference?: string }> = [];
  const or: Array<Record<string, string>> = [];

  if (input.transactionId) {
    references.push({ transactionId: input.transactionId });
    or.push({ reference: input.transactionId });
  }

  if (input.reference) {
    references.push({ reference: input.reference });
    or.push({ reference: input.reference });
  }

  if (references.length === 0) {
    return null;
  }

  const existingIncoming = await prisma.incomingPayment.findFirst({ where: { OR: references } });

  if (existingIncoming) {
    return { incoming: existingIncoming, payment: null };
  }

  const existingPayment = await prisma.payment.findFirst({ where: { OR: or } });

  if (existingPayment) {
    return { incoming: null, payment: existingPayment };
  }

  return null;
}

export async function createIncomingPayment(input: IncomingInput) {
  const duplicate = await findDuplicate(input);

  if (duplicate) {
    if (duplicate.incoming) {
      return {
        incoming: duplicate.incoming,
        matched: duplicate.incoming.status === "MATCHED",
        duplicate: true,
        reason: "Duplicate transaction reference",
        payment: null,
        message: null,
      };
    }

    return {
      incoming: null,
      matched: false,
      duplicate: true,
      reason: "Duplicate transaction reference",
      payment: null,
      message: null,
    };
  }

  const incoming = await prisma.incomingPayment.create({
    data: {
      propertyId: input.propertyId || null,
      amount: String(input.amount),
      method: input.method ?? "MPESA",
      phone: input.phone,
      reference: input.reference || null,
      transactionId: input.transactionId || null,
      receivedAt: input.receivedAt ?? new Date(),
      source: input.source ?? "MANUAL",
      notes: input.notes || null,
      status: "UNMATCHED",
    },
  });

  const match = await autoMatch({ phone: input.phone, propertyId: input.propertyId });

  if (!match.tenant || !match.lease) {
    return { incoming, matched: false, duplicate: false, reason: match.reason, payment: null, message: null };
  }

  const { payment, message } = await recordPayment({
    propertyId: match.tenant.propertyId,
    tenantId: match.tenant.id,
    leaseId: match.lease.id,
    amount: input.amount,
    method: incoming.method,
    reference: input.reference ?? input.transactionId,
    receivedAt: incoming.receivedAt,
    notes: input.notes ?? `Auto-reconciled for ${match.tenant.fullName}`,
    sendSms: true,
  });

  const matched = await prisma.incomingPayment.update({
    where: { id: incoming.id },
    data: {
      status: "MATCHED",
      tenantId: match.tenant.id,
      leaseId: match.lease.id,
      matchedAt: new Date(),
      matchNote: "Auto-matched by phone number",
    },
  });

  return { incoming: matched, matched: true, duplicate: false, reason: null, payment, message };
}

export async function confirmIncomingPayment({
  incomingId,
  tenantId,
  leaseId,
  sendSms = true,
}: {
  incomingId: string;
  tenantId: string;
  leaseId: string;
  sendSms?: boolean;
}) {
  const incoming = await prisma.incomingPayment.findUnique({ where: { id: incomingId } });

  if (!incoming) {
    throw new Error("Incoming payment not found");
  }

  if (incoming.status === "DISCARDED") {
    throw new Error("This payment was already discarded");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, fullName: true, propertyId: true } });
  const lease = await prisma.lease.findUnique({ where: { id: leaseId }, select: { id: true, propertyId: true } });

  if (!tenant || !lease) {
    throw new Error("Select a valid tenant and lease");
  }

  const { payment, message } = await recordPayment({
    propertyId: incoming.propertyId ?? lease.propertyId,
    tenantId,
    leaseId,
    amount: String(incoming.amount),
    method: incoming.method,
    reference: incoming.reference ?? incoming.transactionId,
    receivedAt: incoming.receivedAt,
    notes: incoming.notes ?? `Confirmed manually for ${tenant.fullName}`,
    sendSms,
  });

  const confirmed = await prisma.incomingPayment.update({
    where: { id: incomingId },
    data: {
      status: "MATCHED",
      tenantId,
      leaseId,
      matchedAt: new Date(),
      matchNote: sendSms ? "Confirmed manually" : "Confirmed manually (no SMS)",
    },
  });

  return { incoming: confirmed, payment, message };
}

export async function discardIncomingPayment({ incomingId, reason }: { incomingId: string; reason?: string }) {
  return prisma.incomingPayment.update({
    where: { id: incomingId },
    data: { status: "DISCARDED", matchNote: reason || "Discarded" },
  });
}
