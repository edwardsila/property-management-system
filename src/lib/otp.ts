import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { isSmsConfigured, sendSms } from "@/lib/africastalking";

export const OTP_TTL_MS = 5 * 60 * 1000;

export function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(code, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyOtp(code: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHex] = parts;
  const actual = scryptSync(code, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export type OtpDelivery = {
  ok: boolean;
  devMode: boolean;
  error?: string;
};

export async function sendOtpSms(phone: string, code: string): Promise<OtpDelivery> {
  const message = `Terava admin login code: ${code}. Valid for 5 minutes. Do not share this code with anyone.`;

  if (!isSmsConfigured()) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, devMode: false, error: "SMS is not configured. Set AT_USERNAME and AT_API_KEY." };
    }

    console.log(`\n[terava-auth] Admin OTP for ${phone}: ${code}\n`);
    return { ok: true, devMode: true };
  }

  const result = await sendSms(phone, message);

  if (result.ok) {
    return { ok: true, devMode: false };
  }

  return { ok: false, devMode: false, error: result.error ?? "Unable to send the verification code." };
}
