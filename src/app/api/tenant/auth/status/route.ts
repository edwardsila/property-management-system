import { NextResponse } from "next/server";
import { getTenantSession } from "@/lib/tenant-auth";

export async function GET() {
  const tenant = await getTenantSession();

  if (!tenant) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, tenant });
}
