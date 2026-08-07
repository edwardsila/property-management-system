import { NextResponse } from "next/server";

type DarajaPayload = Record<string, unknown>;

export function readString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

export function readNumber(...values: Array<unknown>) {
  for (const value of values) {
    const parsed = typeof value === "string" ? Number(value) : typeof value === "number" ? value : Number.NaN;

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("254")) {
    return `254${digits.slice(3)}`;
  }

  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  return `254${digits.slice(-9)}`;
}

export function parseDarajaTime(value: string) {
  if (/^\d{14}$/.test(value)) {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(4, 6)) - 1;
    const day = Number(value.slice(6, 8));
    const hour = Number(value.slice(8, 10));
    const minute = Number(value.slice(10, 12));
    const second = Number(value.slice(12, 14));

    const date = new Date(Date.UTC(year, month, day, hour, minute, second) - 3 * 60 * 60 * 1000);

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function checkCallbackSecret(request: Request) {
  const secret = process.env.MPESA_CALLBACK_SECRET?.trim();

  if (!secret) {
    return null;
  }

  const header = request.headers.get("x-callback-secret") ?? "";

  if (header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export function extractC2BFields(body: DarajaPayload) {
  const amount = readNumber(body.TransAmount, body.Amount);

  return {
    shortcode: readString(body.BusinessShortCode, body.ShortCode, body.shortcode),
    transactionId: readString(body.TransID, body.TransId, body.transactionId),
    reference: readString(body.BillRefNumber, body.BillRefNumber2, body.accountReference, body.reference),
    amount,
    phone: readString(body.MSISDN, body.msisdn, body.PhoneNumber, body.phone),
    receivedAt: readString(body.TransTime, body.TransactionDate, body.transactionTime),
    firstName: readString(body.FirstName, body.firstName),
    middleName: readString(body.MiddleName, body.middleName),
    lastName: readString(body.LastName, body.lastName),
  };
}
