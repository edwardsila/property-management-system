import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireAdmin } from "@/lib/auth";

type ExpenseCategory =
  | "REPAIRS"
  | "UTILITIES"
  | "STAFF_COSTS"
  | "ADMIN"
  | "TAXES"
  | "OTHER";

export async function PATCH(request: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { expenseId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });

  if (!existing) {
    return jsonError("Expense not found", 404);
  }

  const title = getString(body.title);
  const amount = getString(body.amount);
  const amountNumber = Number(amount);
  const occurredAt = typeof body.occurredAt === "string" && body.occurredAt ? new Date(body.occurredAt) : null;

  const data: Record<string, unknown> = {};

  if (title) {
    data.title = title;
  }

  if (amount && Number.isFinite(amountNumber) && amountNumber > 0) {
    data.amount = amountNumber;
  }

  if (body.category) {
    data.category = body.category as ExpenseCategory;
  }

  if (body.vendor !== undefined) {
    data.vendor = getString(body.vendor) || null;
  }

  if (body.notes !== undefined) {
    data.notes = getString(body.notes) || null;
  }

  if (occurredAt) {
    data.occurredAt = occurredAt;
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data,
  });

  return NextResponse.json({ expense });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { expenseId } = await params;
  const existing = await prisma.expense.findUnique({ where: { id: expenseId } });

  if (!existing) {
    return jsonError("Expense not found", 404);
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  return NextResponse.json({ ok: true });
}
