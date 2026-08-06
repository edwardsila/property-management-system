import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../../_shared";
import { ADMIN_EMAIL, createSessionToken, sessionCookieHeader } from "@/lib/auth";
import { verifyOtp } from "@/lib/otp";
import { isValidKenyanMobile, parseKenyanPhone } from "@/lib/phone";

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

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (!admin || !admin.phone || admin.phone !== parseKenyanPhone(phoneRaw)) {
    return jsonError("Incorrect phone number or code.", 401);
  }

  if (!admin.otpCodeHash || !admin.otpExpiresAt) {
    return jsonError("No code has been sent. Request a new one.", 400);
  }

  if (admin.otpExpiresAt.getTime() < Date.now()) {
    return jsonError("This code has expired. Request a new one.", 400);
  }

  if (!verifyOtp(code, admin.otpCodeHash)) {
    return jsonError("Incorrect code. Try again.", 401);
  }

  await prisma.user.update({
    where: { id: admin.id },
    data: { otpCodeHash: null, otpExpiresAt: null },
  });

  const token = createSessionToken(admin.id);

  return NextResponse.json(
    {
      ok: true,
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    },
    { headers: { "Set-Cookie": sessionCookieHeader(token) } },
  );
}
