import { NextResponse } from "next/server";
import { jsonError } from "../../_shared";
import { requireAdmin } from "@/lib/auth";
import { sendSms, isSmsConfigured } from "@/lib/termii";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const phoneRaw = getString(body.phone);

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;

  if (!isSmsConfigured()) {
    return jsonError("Termii SMS is not configured. Set TERMII_API_KEY and TERMII_SENDER_ID to send real messages.", 503);
  }

  const propertyName = getString(body.propertyName);
  const message = propertyName
    ? `Hi, this is a test message from ${propertyName}. Your number is correctly registered to receive rent alerts.`
    : "Hi, this is a test message from your property manager. Your number is correctly registered to receive rent alerts.";

  const result = await sendSms(phone, message);

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      phone,
      messageId: result.messageId ?? null,
      requestId: result.requestId ?? null,
      cost: result.cost ?? null,
    });
  }

  return NextResponse.json({ ok: false, error: result.error ?? "Unable to send the test message" }, { status: 502 });
}
