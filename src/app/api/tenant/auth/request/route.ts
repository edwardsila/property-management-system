import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { generateOtp, hashOtp, OTP_TTL_MS, sendTenantOtpSms } from "@/lib/otp";
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
  const tenants = await prisma.tenant.findMany({
    where: { OR: [{ phone }, { phone: phoneRaw.replace(/\s/g, "").replace(/^\+?0/, "0") }] },
  });

  if (tenants.length === 0) {
    return jsonError("No tenant account was found for this number. Check the number or contact the property office.", 404);
  }

  if (tenants.length > 1) {
    return jsonError("This number is linked to more than one account. Please contact the property office.", 409);
  }

  const tenant = tenants[0];

  if (tenant.otpLockedUntil && tenant.otpLockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((tenant.otpLockedUntil.getTime() - Date.now()) / 60000));
    return jsonError(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429);
  }

  const code = generateOtp();
  const delivery = await sendTenantOtpSms(phone, code);

  if (!delivery.ok) {
    return jsonError(delivery.error ?? "Unable to send the verification code.", 502);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      otpCodeHash: hashOtp(code),
      otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
      otpAttempts: 0,
      otpLockedUntil: null,
    },
  });

  return NextResponse.json({
    ok: true,
    devMode: delivery.devMode,
    hint: delivery.devMode
      ? `Development mode — the code was printed to the server console.${delivery.error ? ` (SMS failed: ${delivery.error})` : ""}`
      : undefined,
  });
}
