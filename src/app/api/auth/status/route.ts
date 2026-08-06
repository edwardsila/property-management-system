import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL, getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();

  if (user) {
    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  return NextResponse.json({
    authenticated: false,
    setup: !admin?.phone,
    phone: admin?.phone ?? null,
  });
}
