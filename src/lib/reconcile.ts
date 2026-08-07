import { prisma } from "@/lib/prisma";
import { parseKenyanPhone } from "@/lib/phone";
import { composeMessageBody, deliverMessage } from "@/lib/messaging";
import { allocatePayment, leaseBalance, nextRentDueDate, paymentTotalsForLease } from "@/lib/rental";

export type PaymentMethod = "CASH" | "BANK" | "MPESA" | "OTHER";

export type MatchBy = "STK_PUSH" | "ACCOUNT_REF" | "UNIT_NAME" | "PHONE" | "MANUAL";

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
  checkoutRequestId?: string | null;
};

type AutoMatchInput = {
  phone: string;
  propertyId?: string | null;
  reference?: string | null;
  forcedTenantId?: string | null;
  forcedLeaseId?: string | null;
};

type UnitCandidate = {
  id: string;
  propertyId: string;
  unitName: string;
  unitCode: string | null;
  paymentAccountRef: string | null;
};

type AutoMatchResult = {
  tenant: { id: string; propertyId: string; fullName: string } | null;
  lease: { id: string; propertyId: string } | null;
  unit: UnitCandidate | null;
  reason: string | null;
  matchedBy: MatchBy;
};

export function normalizeAccountRef(value: string | null | undefined) {
  return (value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

async function findBestLeaseForUnit(unitId: string, propertyId: string) {
  const active = await prisma.lease.findFirst({
    where: { unitId, propertyId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { id: true, propertyId: true, fullName: true } } },
  });

  if (active) {
    return active;
  }

  return prisma.lease.findFirst({
    where: { unitId, propertyId },
    orderBy: { createdAt: "desc" },
    include: { tenant: { select: { id: true, propertyId: true, fullName: true } } },
  });
}

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

export async function autoMatch({ phone, propertyId, reference, forcedTenantId, forcedLeaseId }: AutoMatchInput): Promise<AutoMatchResult> {
  if (forcedTenantId && forcedLeaseId) {
    const lease = await prisma.lease.findFirst({
      where: { id: forcedLeaseId, tenantId: forcedTenantId },
      include: { tenant: { select: { id: true, propertyId: true, fullName: true } } },
    });

    if (lease) {
      return { tenant: lease.tenant, lease, unit: null, reason: null, matchedBy: "STK_PUSH" };
    }
  }

  let unitMatch: { unit: UnitCandidate; field: "paymentAccountRef" | "unitCode" | "unitName" } | null = null;
  let unitLease = null;
  let unitReason: string | null = null;

  if (reference) {
    const ref = normalizeAccountRef(reference);

    if (ref) {
      const units = await prisma.unit.findMany({
        where: propertyId ? { propertyId } : undefined,
        select: { id: true, propertyId: true, unitName: true, unitCode: true, paymentAccountRef: true },
      });

      const matches: Array<{ unit: UnitCandidate; field: "paymentAccountRef" | "unitCode" | "unitName" }> = [];

      for (const unit of units) {
        if (normalizeAccountRef(unit.paymentAccountRef) === ref) {
          matches.push({ unit, field: "paymentAccountRef" });
        } else if (normalizeAccountRef(unit.unitCode) === ref) {
          matches.push({ unit, field: "unitCode" });
        } else if (normalizeAccountRef(unit.unitName) === ref) {
          matches.push({ unit, field: "unitName" });
        }
      }

      if (matches.length === 1) {
        unitMatch = matches[0];
        unitLease = await findBestLeaseForUnit(unitMatch.unit.id, unitMatch.unit.propertyId);
      } else if (matches.length > 1) {
        unitReason = "Multiple units share this payment account. Confirm manually.";
      }
    }
  }

  if (unitLease?.tenant) {
    return {
      tenant: unitLease.tenant,
      lease: unitLease,
      unit: unitMatch!.unit,
      reason: null,
      matchedBy: unitMatch!.field === "paymentAccountRef" || unitMatch!.field === "unitCode" ? "ACCOUNT_REF" : "UNIT_NAME",
    };
  }

  const heldForUnit = unitMatch ? `Deposit held for unit ${unitMatch.unit.unitName} — awaiting a lease.` : null;
  const normalized = parseKenyanPhone(phone);

  if (!normalized) {
    return { tenant: null, lease: null, unit: unitMatch?.unit ?? null, reason: heldForUnit ?? unitReason ?? "The payment phone number is not a valid Kenyan mobile number.", matchedBy: null as unknown as MatchBy };
  }

  const tenants = await prisma.tenant.findMany({
    where: propertyId ? { propertyId } : undefined,
    select: { id: true, propertyId: true, phone: true, fullName: true },
  });

  const matches = tenants.filter((tenant) => parseKenyanPhone(tenant.phone) === normalized);

  if (matches.length === 0) {
    return { tenant: null, lease: null, unit: unitMatch?.unit ?? null, reason: heldForUnit ?? unitReason ?? "No tenant matched the payment phone number.", matchedBy: null as unknown as MatchBy };
  }

  if (matches.length > 1) {
    return { tenant: null, lease: null, unit: unitMatch?.unit ?? null, reason: "Multiple tenants share this phone number. Confirm manually.", matchedBy: null as unknown as MatchBy };
  }

  const tenant = matches[0];
  const lease = await findBestLease(tenant.id, tenant.propertyId);

  if (!lease) {
    return { tenant, lease: null, unit: unitMatch?.unit ?? null, reason: heldForUnit ?? "Tenant matched but has no lease to attach the payment to.", matchedBy: null as unknown as MatchBy };
  }

  return { tenant, lease, unit: unitMatch?.unit ?? null, reason: null, matchedBy: "PHONE" };
}

export async function sendPaymentReceipt({
  leaseId,
  tenantId,
  amount,
  reference,
  latestRentPortion,
  depositRequired,
}: {
  leaseId: string;
  tenantId: string;
  amount: number;
  reference?: string | null;
  latestRentPortion?: number;
  depositRequired?: number;
}) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      tenant: { select: { fullName: true } },
      unit: { select: { unitName: true, unitCode: true, paymentAccountRef: true } },
      property: { select: { paybillNumber: true } },
    },
  });

  if (!lease) {
    return null;
  }

  const totals = await paymentTotalsForLease(leaseId);
  const requiredDeposit = depositRequired ?? Number(lease.depositAmount ?? 0);
  const balance = leaseBalance(lease, totals.rentPaid, new Date());
  const dueDate = nextRentDueDate(lease.startDate, lease.graceDays);
  const balanceBefore = balance.accrued - (totals.rentPaid - (latestRentPortion ?? 0));

  const body = composeMessageBody("PAYMENT_RECEIVED", {
    tenantName: lease.tenant.fullName,
    unitName: lease.unit?.unitName ?? null,
    monthlyRent: balance.monthlyRent,
    balance: balance.balance,
    balanceBefore,
    dueDate,
    amount,
    depositPaid: totals.depositPaid,
    depositRequired: requiredDeposit,
    paybillNumber: lease.property?.paybillNumber ?? null,
    accountReference: lease.unit?.paymentAccountRef ?? lease.unit?.unitCode ?? lease.unit?.unitName ?? null,
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
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    select: { depositAmount: true },
  });

  const amountNumber = Number(amount);
  const depositRequired = lease ? Number(lease.depositAmount ?? 0) : 0;
  const depositPaidBefore = lease ? (await paymentTotalsForLease(leaseId)).depositPaid : 0;
  const split = allocatePayment({ amount: amountNumber, depositRequired, depositPaid: depositPaidBefore });

  const payment = await prisma.payment.create({
    data: {
      propertyId,
      leaseId,
      tenantId,
      amount: String(amount),
      method: method ?? "MPESA",
      status: "CONFIRMED",
      allocation: split.allocation,
      depositPortion: String(split.depositPortion),
      rentPortion: String(split.rentPortion),
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
      amount: amountNumber,
      reference: reference || null,
      latestRentPortion: split.rentPortion,
      depositRequired,
    });
  }

  await activateLeaseOnFirstRent(leaseId);

  return { payment, message, allocation: split };
}

const matchNotes: Record<MatchBy, string> = {
  STK_PUSH: "Auto-matched via STK push",
  ACCOUNT_REF: "Auto-matched by paybill account",
  UNIT_NAME: "Auto-matched by unit name",
  PHONE: "Auto-matched by phone number",
  MANUAL: "Confirmed manually",
};

export function matchNoteFor(matchedBy: MatchBy) {
  return matchNotes[matchedBy];
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

  let pending = null;
  let forcedTenantId: string | null = null;
  let forcedLeaseId: string | null = null;
  let forcedPropertyId: string | null = null;

  if (input.checkoutRequestId) {
    pending = await prisma.pendingPayment.findUnique({ where: { checkoutRequestId: input.checkoutRequestId } });

    if (pending?.status === "COMPLETED") {
      return {
        incoming: null,
        matched: false,
        duplicate: true,
        reason: "Duplicate checkout request",
        payment: null,
        message: null,
      };
    }

    if (pending) {
      forcedTenantId = pending.tenantId;
      forcedLeaseId = pending.leaseId;
      forcedPropertyId = pending.propertyId;
    }
  }

  const match = await autoMatch({
    phone: input.phone,
    propertyId: forcedPropertyId ?? input.propertyId,
    reference: input.reference,
    forcedTenantId,
    forcedLeaseId,
  });

  const incoming = await prisma.incomingPayment.create({
    data: {
      propertyId: input.propertyId || null,
      unitId: match.unit?.id ?? null,
      amount: String(input.amount),
      method: input.method ?? "MPESA",
      phone: input.phone,
      reference: input.reference || null,
      transactionId: input.transactionId || null,
      receivedAt: input.receivedAt ?? new Date(),
      source: input.source ?? "MANUAL",
      notes: input.notes || null,
      status: "UNMATCHED",
      matchNote: match.reason ?? null,
    },
  });

  if (!match.tenant || !match.lease) {
    if (pending) {
      await prisma.pendingPayment.update({
        where: { id: pending.id },
        data: { status: "FAILED", error: match.reason ?? "Payment could not be reconciled" },
      });
    }

    return { incoming, matched: false, duplicate: false, reason: match.reason, payment: null, message: null };
  }

  const { payment, message } = await recordPayment({
    propertyId: forcedPropertyId ?? match.tenant.propertyId,
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
      matchedBy: match.matchedBy ?? "PHONE",
      matchNote: matchNoteFor(match.matchedBy ?? "PHONE"),
    },
  });

  if (pending) {
    await prisma.pendingPayment.update({
      where: { id: pending.id },
      data: { status: "COMPLETED", callbackTransactionId: input.transactionId || null },
    });
  }

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
      matchedBy: "MANUAL",
      matchNote: sendSms ? matchNotes.MANUAL : `${matchNotes.MANUAL} (no SMS)`,
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

export async function activateLeaseOnFirstRent(leaseId: string) {
  const lease = await prisma.lease.findUnique({
    where: { id: leaseId },
    include: {
      tenant: { select: { fullName: true } },
      unit: { select: { unitName: true } },
    },
  });

  if (!lease || lease.status !== "DRAFT") {
    return null;
  }

  const totals = await paymentTotalsForLease(leaseId);

  if (totals.rentPaid < Number(lease.monthlyRent)) {
    return null;
  }

  await prisma.$transaction([
    prisma.lease.update({
      where: { id: leaseId },
      data: { status: "ACTIVE", moveInDate: lease.moveInDate ?? new Date() },
    }),
    prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: "OCCUPIED" },
    }),
  ]);

  const balance = leaseBalance(lease, totals.rentPaid, new Date());

  const message = await prisma.message.create({
    data: {
      propertyId: lease.propertyId,
      tenantId: lease.tenantId,
      leaseId,
      type: "LEASE_ACTIVATED",
      channel: "SMS",
      body: composeMessageBody("LEASE_ACTIVATED", {
        tenantName: lease.tenant.fullName,
        unitName: lease.unit?.unitName ?? null,
        monthlyRent: balance.monthlyRent,
        balance: balance.balance,
        dueDate: nextRentDueDate(lease.startDate, lease.graceDays),
      }),
      status: "QUEUED",
    },
  });

  return deliverMessage(message.id);
}

export async function attachIncomingPaymentsByPhone({ tenantId, propertyId, phone }: { tenantId: string; propertyId: string; phone: string }) {
  const normalized = parseKenyanPhone(phone);

  if (!normalized) {
    return 0;
  }

  const candidates = await prisma.incomingPayment.findMany({
    where: { propertyId, tenantId: null, status: "UNMATCHED" },
    select: { id: true, phone: true },
  });

  const ids = candidates.filter((item) => parseKenyanPhone(item.phone) === normalized).map((item) => item.id);

  if (ids.length === 0) {
    return 0;
  }

  const result = await prisma.incomingPayment.updateMany({
    where: { id: { in: ids } },
    data: { tenantId },
  });

  return result.count;
}

export async function autoApplyHeldPayments({ leaseId, tenantId, unitId, propertyId }: { leaseId: string; tenantId: string; unitId: string; propertyId: string }) {
  const held = await prisma.incomingPayment.findMany({
    where: {
      unitId,
      propertyId,
      status: "UNMATCHED",
      OR: [{ tenantId: null }, { tenantId }],
    },
    orderBy: { receivedAt: "asc" },
    select: { id: true },
  });

  let applied = 0;

  for (const item of held) {
    try {
      await confirmIncomingPayment({ incomingId: item.id, tenantId, leaseId, sendSms: true });
      applied += 1;
    } catch {
      // leave the payment in the queue if it cannot be confirmed
    }
  }

  return applied;
}
