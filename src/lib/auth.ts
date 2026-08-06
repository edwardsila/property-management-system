import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export { SESSION_COOKIE, createSessionToken, sessionCookieHeader, clearSessionCookieHeader } from "@/lib/session";

export const ADMIN_EMAIL = "owner@property.local";

export function getAdminPhone() {
  return process.env.ADMIN_PHONE?.trim() || null;
}

export async function ensureAdminUser() {
  const envPhone = getAdminPhone();

  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: envPhone ? { phone: envPhone } : {},
    create: { name: "Default Owner", email: ADMIN_EMAIL, phone: envPhone, role: "OWNER" },
  });
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);

  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  if (!user) {
    return null;
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export type AuthResult = { user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> } | NextResponse;

export async function requireAdmin(): Promise<AuthResult> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return { user };
}
