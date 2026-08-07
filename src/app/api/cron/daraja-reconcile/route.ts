import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stkQuery } from "@/lib/daraja";
import { createIncomingPayment } from "@/lib/reconcile";

const STUCK_AFTER_MS = 3 * 60 * 1000;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization") ?? "";

  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - STUCK_AFTER_MS);

  const pending = await prisma.pendingPayment.findMany({
    where: { status: "PENDING", createdAt: { lt: cutoff } },
    take: 25,
    include: { property: { select: { paybillNumber: true, paybillPasskey: true } } },
  });

  const results: Array<{ id: string; status: string; note: string }> = [];

  for (const item of pending) {
    if (!item.checkoutRequestId) {
      continue;
    }

    const query = await stkQuery({
      checkoutRequestId: item.checkoutRequestId,
      shortcode: item.property?.paybillNumber?.trim() || undefined,
      passkey: item.property?.paybillPasskey?.trim() || undefined,
    });

    if (!query.ok) {
      results.push({ id: item.id, status: "SKIPPED", note: query.error });
      continue;
    }

    if (query.resultCode === "0" && query.transactionId) {
      const result = await createIncomingPayment({
        propertyId: item.propertyId,
        amount: Number(query.amount ?? item.amount),
        method: "MPESA",
        phone: query.phone ?? item.phone,
        reference: query.reference ?? item.accountReference,
        transactionId: query.transactionId,
        receivedAt: new Date(),
        source: "DARAJ_A",
        notes: "Reconciled by STK status query",
        checkoutRequestId: item.checkoutRequestId,
      });

      results.push({ id: item.id, status: result.matched ? "COMPLETED" : "QUEUED", note: result.reason ?? "Matched" });
    } else {
      await prisma.pendingPayment.update({
        where: { id: item.id },
        data: { status: "FAILED", error: query.resultDesc || `STK query returned result code ${query.resultCode}` },
      });

      results.push({ id: item.id, status: "FAILED", note: query.resultDesc });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
