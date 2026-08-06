import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { ensureAdminUser } from "@/lib/auth";
import { generateOtp, hashOtp, OTP_TTL_MS, sendOtpSms } from "@/lib/otp";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const phoneRaw = getString(body.phone);

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;
  const admin = await ensureAdminUser();

  if (admin.phone && admin.phone !== phone) {
    return jsonError("This number is not registered for admin access.", 403);
  }

  const code = generateOtp();
  const delivery = await sendOtpSms(phone, code);

  if (!delivery.ok) {
    return jsonError(delivery.error ?? "Unable to send the verification code.", 502);
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { phone, otpCodeHash: hashOtp(code), otpExpiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  return NextResponse.json({
    ok: true,
    devMode: delivery.devMode,
    hint: delivery.devMode
      ? `Development mode — the code was printed to the server console.${delivery.error ? ` (SMS failed: ${delivery.error})` : ""}`
      : undefined,
  });
}
