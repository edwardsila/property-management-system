import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { createSessionToken, sessionCookieHeader } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

const STAFF_ROLES: UserRole[] = ["OWNER", "AGENT_CARETAKER"];
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
  const user = await prisma.user.findFirst({
    where: { phone, role: { in: STAFF_ROLES } },
  });

  if (!user) {
    return jsonError("Incorrect phone number or code.", 401);
  }

  if (!user.otpCodeHash || !user.otpExpiresAt) {
    return jsonError("No code has been sent. Request a new one.", 400);
  }

  if (user.otpExpiresAt.getTime() < Date.now()) {
    return jsonError("This code has expired. Request a new one.", 400);
  }

  if (user.otpLockedUntil && user.otpLockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / 60000));
    return jsonError(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429);
  }

  if (!verifyOtp(code, user.otpCodeHash)) {
    const attempts = user.otpAttempts + 1;
    const data =
      attempts >= MAX_OTP_ATTEMPTS
        ? { otpAttempts: 0, otpLockedUntil: new Date(Date.now() + OTP_LOCK_MS) }
        : { otpAttempts: attempts };

    await prisma.user.update({ where: { id: user.id }, data });

    if (attempts >= MAX_OTP_ATTEMPTS) {
      return jsonError("Too many failed attempts. Try again in 15 minutes.", 429);
    }

    return jsonError("Incorrect code. Try again.", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { otpCodeHash: null, otpExpiresAt: null, otpAttempts: 0, otpLockedUntil: null },
  });

  const token = createSessionToken(user.id);

  return NextResponse.json(
    {
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    },
    { headers: { "Set-Cookie": sessionCookieHeader(token) } },
  );
}
