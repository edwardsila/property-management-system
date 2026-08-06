import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TENANT_SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export {
  TENANT_SESSION_COOKIE,
  createSessionToken,
  tenantSessionCookieHeader,
  clearTenantSessionCookieHeader,
} from "@/lib/session";

export type TenantSession = {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string;
};

export async function getTenantSession(): Promise<TenantSession | null> {
  const store = await cookies();
  const token = store.get(TENANT_SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = verifySessionToken(token);

  if (!session) {
    return null;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.userId },
    select: { id: true, propertyId: true, fullName: true, phone: true },
  });

  if (!tenant) {
    return null;
  }

  return tenant;
}

export type TenantAuthResult = { tenant: TenantSession } | NextResponse;

export async function requireTenant(): Promise<TenantAuthResult> {
  const tenant = await getTenantSession();

  if (!tenant) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return { tenant };
}
