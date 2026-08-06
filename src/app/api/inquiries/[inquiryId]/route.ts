import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getString, jsonError } from "../../_shared";
import { requireAdmin } from "@/lib/auth";

type InquiryStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED";

export async function PATCH(request: Request, { params }: { params: Promise<{ inquiryId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { inquiryId } = await params;
  const body = await request.json().catch(() => null);

  if (!body) {
    return jsonError("Invalid JSON payload");
  }

  const existing = await prisma.inquiry.findUnique({ where: { id: inquiryId } });

  if (!existing) {
    return jsonError("Inquiry not found", 404);
  }

  const status = getString(body.status);

  const inquiry = await prisma.inquiry.update({
    where: { id: inquiryId },
    data: {
      ...(status ? { status: status as InquiryStatus } : {}),
    },
  });

  return NextResponse.json({ inquiry });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ inquiryId: string }> }) {
  const auth = await requireAdmin();

  if (auth instanceof NextResponse) {
    return auth;
  }

  const { inquiryId } = await params;
  const existing = await prisma.inquiry.findUnique({ where: { id: inquiryId } });

  if (!existing) {
    return jsonError("Inquiry not found", 404);
  }

  await prisma.inquiry.delete({ where: { id: inquiryId } });

  return NextResponse.json({ ok: true });
}
