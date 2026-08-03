import { NextResponse } from "next/server";
import { jsonError } from "../../../_shared";
import { confirmIncomingPayment, discardIncomingPayment } from "@/lib/reconcile";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ incomingId: string }> }) {
  const { incomingId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const action = getString(body.action);

  if (action === "discard") {
    try {
      const incoming = await discardIncomingPayment({ incomingId, reason: getString(body.reason) || undefined });

      return NextResponse.json({ ok: true, action, incoming });
    } catch (requestError) {
      return jsonError(requestError instanceof Error ? requestError.message : "Unable to discard payment", 400);
    }
  }

  if (action === "confirm") {
    const tenantId = getString(body.tenantId);
    const leaseId = getString(body.leaseId);

    if (!tenantId || !leaseId) {
      return jsonError("Select a tenant and a lease to confirm the payment against");
    }

    try {
      const result = await confirmIncomingPayment({
        incomingId,
        tenantId,
        leaseId,
        sendSms: body.sendSms !== false,
      });

      return NextResponse.json({
        ok: true,
        action,
        incoming: result.incoming,
        payment: result.payment,
        message: result.message
          ? {
              id: result.message.id,
              status: result.message.status,
              error: result.message.error ?? null,
              sentAt: result.message.sentAt?.toISOString() ?? null,
            }
          : null,
      });
    } catch (requestError) {
      return jsonError(requestError instanceof Error ? requestError.message : "Unable to confirm payment", 400);
    }
  }

  return jsonError("Unknown action — expected 'confirm' or 'discard'");
}
