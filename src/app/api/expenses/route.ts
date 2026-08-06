import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../_shared";
import { requireAdmin } from "@/lib/auth";

type ExpenseCategory =
  | "REPAIRS"
  | "UTILITIES"
  | "STAFF_COSTS"
  | "ADMIN"
  | "TAXES"
  | "OTHER";

function toDate(value: unknown) {
  return typeof value === "string" && value ? new Date(value) : new Date();
}

export async function GET(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const propertyId = new URL(request.url).searchParams.get("propertyId");
  const expenses = await prisma.expense.findMany({
    where: propertyId ? { propertyId } : undefined,
    orderBy: [{ occurredAt: "desc" }],
  });

  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const propertyId = getString(body.propertyId);
  const title = getString(body.title);
  const amount = getString(body.amount);
  const category = body.category as ExpenseCategory | undefined;
  const vendor = getString(body.vendor);

  if (!propertyId) {
    return jsonError("Select a property workspace first");
  }

  if (!title) {
    return jsonError("Enter a short title for this expense");
  }

  const amountNumber = Number(amount);

  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return jsonError("Enter a valid expense amount");
  }

  const expense = await prisma.expense.create({
    data: {
      propertyId,
      title,
      amount: amountNumber,
      category: category ?? "OTHER",
      vendor: vendor || null,
      notes: getString(body.notes) || null,
      occurredAt: toDate(body.occurredAt),
    },
  });

  return NextResponse.json({ expense }, { status: 201 });
}
