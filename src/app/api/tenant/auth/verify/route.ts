import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { verifyOtp } from "@/lib/otp";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";
import { createSessionToken, tenantSessionCookieHeader } from "@/lib/tenant-auth";

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const phoneRaw = getString(body.phone);
  const code = getString(body.code);

  if (!isValidKenyanMobile(phoneRaw)) {
    return jsonError("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678)");
  }

  if (!/^\d{6}$/.test(code)) {
    return jsonError("Enter the 6-digit code.");
  }

  const phone = parseKenyanPhone(phoneRaw) as string;
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ phone }, { phone: phoneRaw.replace(/\s/g, "").replace(/^\+?0/, "0") }] },
  });

  if (!tenant) {
    return jsonError("No tenant account was found for this number.", 404);
  }

  if (!tenant.otpCodeHash || !tenant.otpExpiresAt) {
    return jsonError("No code has been sent. Request a new one.", 400);
  }

  if (tenant.otpExpiresAt.getTime() < Date.now()) {
    return jsonError("This code has expired. Request a new one.", 400);
  }

  if (tenant.otpLockedUntil && tenant.otpLockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((tenant.otpLockedUntil.getTime() - Date.now()) / 60000));
    return jsonError(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429);
  }

  if (!verifyOtp(code, tenant.otpCodeHash)) {
    const attempts = tenant.otpAttempts + 1;
    const data =
      attempts >= MAX_OTP_ATTEMPTS
        ? { otpAttempts: 0, otpLockedUntil: new Date(Date.now() + OTP_LOCK_MS) }
        : { otpAttempts: attempts };

    await prisma.tenant.update({ where: { id: tenant.id }, data });

    if (attempts >= MAX_OTP_ATTEMPTS) {
      return jsonError("Too many failed attempts. Try again in 15 minutes.", 429);
    }

    return jsonError("Incorrect code. Try again.", 401);
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { otpCodeHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockedUntil: null },
  });

  const token = createSessionToken(tenant.id);

  return NextResponse.json(
    {
      ok: true,
      tenant: { id: tenant.id, propertyId: tenant.propertyId, fullName: tenant.fullName, phone: tenant.phone },
    },
    { headers: { "Set-Cookie": tenantSessionCookieHeader(token) } },
  );
}
