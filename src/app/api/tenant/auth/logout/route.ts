import { NextResponse } from "next/server";
import { clearTenantSessionCookieHeader } from "@/lib/tenant-auth";

export async function POST() {
  return NextResponse.json({ ok: true }, { headers: { "Set-Cookie": clearTenantSessionCookieHeader() } });
}
