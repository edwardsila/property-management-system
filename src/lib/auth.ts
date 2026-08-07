import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export { SESSION_COOKIE, createSessionToken, sessionCookieHeader, clearSessionCookieHeader } from "@/lib/session";

export const ADMIN_EMAIL = "teravaproperties@gmail.com";

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

const STAFF_ROLES = ["OWNER", "AGENT_CARETAKER"] as const;

export type SessionUserRole = (typeof STAFF_ROLES)[number] | "TENANT";

export async function requireAdmin(): Promise<AuthResult> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

  return { user };
}

export async function requireStaff(): Promise<AuthResult> {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!(STAFF_ROLES as readonly string[]).includes(user.role)) {
    return NextResponse.json({ error: "Not authorized for staff access" }, { status: 403 });
  }

  return { user };
}

export async function canManageProperty(userId: string, role: string, propertyId: string) {
  if (role === "OWNER") {
    return true;
  }

  if (role !== "AGENT_CARETAKER") {
    return false;
  }

  const property = await prisma.property.findFirst({
    where: { id: propertyId, managerId: userId },
    select: { id: true },
  });

  return property !== null;
}

export async function requireStaffForProperty(userId: string, role: string, propertyId: string) {
  const canManage = await canManageProperty(userId, role, propertyId);

  if (!canManage) {
    return NextResponse.json({ error: "You do not have access to this property" }, { status: 403 });
  }

  return null;
}
