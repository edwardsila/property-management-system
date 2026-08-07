import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeAccountRef } from "@/lib/reconcile";
import { checkCallbackSecret, extractC2BFields } from "../../_helpers";

export async function POST(request: Request) {
  const secretError = checkCallbackSecret(request);

  if (secretError) {
    return secretError;
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!body) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payload" });
  }

  const fields = extractC2BFields(body);

  if (!fields.shortcode || !fields.reference) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Missing shortcode or account reference" });
  }

  try {
    const property = await prisma.property.findFirst({ where: { paybillNumber: fields.shortcode } });

    if (!property) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Unknown paybill number." });
    }

    const ref = normalizeAccountRef(fields.reference);

    if (!ref) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payment account" });
    }

    const units = await prisma.unit.findMany({
      where: { propertyId: property.id },
      select: { paymentAccountRef: true, unitCode: true, unitName: true },
    });

    const matched = units.some(
      (unit) =>
        normalizeAccountRef(unit.paymentAccountRef) === ref ||
        normalizeAccountRef(unit.unitCode) === ref ||
        normalizeAccountRef(unit.unitName) === ref,
    );

    if (!matched) {
      return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid payment account. Check the account number and try again." });
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (requestError) {
    console.error("Daraja C2B validation failed:", requestError);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Server error" });
  }
}
