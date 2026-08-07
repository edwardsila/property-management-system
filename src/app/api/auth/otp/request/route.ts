import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { ensureAdminUser } from "@/lib/auth";
import { generateOtp, hashOtp, OTP_TTL_MS, sendOtpSms } from "@/lib/otp";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

const STAFF_ROLES: UserRole[] = ["OWNER", "AGENT_CARETAKER"];

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

  let user = null;

  if (admin.phone === phone) {
    user = admin;
  } else {
    user = await prisma.user.findFirst({
      where: { phone, role: { in: STAFF_ROLES } },
    });
  }

  if (!user) {
    if (!admin.phone) {
      user = admin;
    } else {
      return jsonError("This number is not registered for owner or staff access.", 403);
    }
  }

  if (user.otpLockedUntil && user.otpLockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / 60000));
    return jsonError(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, 429);
  }

  const code = generateOtp();
  const delivery = await sendOtpSms(phone, code);

  if (!delivery.ok) {
    return jsonError(delivery.error ?? "Unable to send the verification code.", 502);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      phone,
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
