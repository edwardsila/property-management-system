import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "terava_admin_session";
export const TENANT_SESSION_COOKIE = "terava_tenant_session";
const SESSION_DAYS = 7;

export function getAuthSecret() {
  return process.env.AUTH_SECRET || "terava-local-dev-secret-change-me";
}

function secureCookies() {
  return (process.env.BASE_URL || "").startsWith("https://");
}

function sign(data: string) {
  return createHmac("sha256", getAuthSecret()).update(data).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string; exp?: number };

    if (!data.sub || typeof data.exp !== "number" || data.exp < Date.now()) {
      return null;
    }

    return { userId: data.sub };
  } catch {
    return null;
  }
}

export function sessionCookieHeader(token: string) {
  const secure = secureCookies();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure ? "; Secure" : ""}`;
}

export function tenantSessionCookieHeader(token: string) {
  const secure = secureCookies();
  return `${TENANT_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookieHeader() {
  const secure = secureCookies();
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function clearTenantSessionCookieHeader() {
  const secure = secureCookies();
  return `${TENANT_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}
