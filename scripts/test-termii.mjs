// Diagnose the Termii SMS credentials.
//
// Loads .env files in the same order Next.js does (first set wins):
//   .env.local  >  .env
//
// Usage:
//   node scripts/test-termii.mjs                    # sends to ADMIN_PHONE (or 254712345678)
//   node scripts/test-termii.mjs 0712 345 678       # sends to a specific number
//
// Prints what is loaded from env, then the raw response from Termii.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");

for (const file of [".env.local", ".env"]) {
  const path = join(ROOT, file);
  if (existsSync(path)) {
    config({ path, override: false });
  }
}

const apiKey = (process.env.TERMII_API_KEY || "").trim();
const senderId = (process.env.TERMII_SENDER_ID || "").trim();
const channel = (process.env.TERMII_CHANNEL || "generic").trim();
const baseUrlOverride = (process.env.TERMII_BASE_URL || "").trim();

const isSandbox = apiKey.startsWith("TLtest");
const baseUrl = baseUrlOverride || (isSandbox ? "https://api.termii.com/api" : "https://api.ng.termii.com/api");

function maskKey(key) {
  if (key.length < 12) return "(too short — did it get copied fully?)";
  return `${key.slice(0, 8)}…${key.slice(-6)} (${key.length} chars)`;
}

console.log("Loaded Termii credentials:");
console.log(`  api key   : ${apiKey ? maskKey(apiKey) : "(empty)"}`);
console.log(`  sender id : ${senderId || "(empty — required by Termii)"}`);
console.log(`  channel   : ${channel}`);
console.log("");

if (!apiKey || !senderId) {
  console.error("TERMII_API_KEY / TERMII_SENDER_ID missing or empty. That's why SMS 'isn't configured'.");
  process.exit(1);
}

console.log(`Environment detected: ${isSandbox ? "SANDBOX (key starts with TLtest)" : "LIVE"}`);
console.log(`Base URL           : ${baseUrl}${baseUrlOverride ? " (TERMII_BASE_URL override)" : ""}`);
console.log("");

// Step 1 — credentials check via the balance endpoint (GET).
console.log("Step 1 · checking credentials (balance endpoint) …");

let balanceStatus = "unknown";

for (const endpoint of ["/get-balance", "/check/balance", "/insight/balance"]) {
  const url = `${baseUrl}${endpoint}?api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const raw = await response.text();
  console.log(`  GET ${endpoint} → HTTP ${response.status} ${raw.slice(0, 200)}`);
  console.log("");

  if (response.ok) {
    balanceStatus = "ok";
    break;
  }
}

if (balanceStatus !== "ok") {
  console.log("Could not confirm the key with the balance endpoint — continuing to the SMS send test.");
  console.log("A 401/403 here usually means the API key is wrong or is a sandbox key used on the live host.");
  console.log("");
}

function parseKenyanPhone(input) {
  const digits = String(input).replace(/[\s().\-]/g, "").replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("254")) {
    const rest = digits.slice(3);
    if (rest.length === 9) return `254${rest}`;
    if (rest.length === 10 && rest.startsWith("0")) return `254${rest.slice(1)}`;
    return null;
  }
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    return rest.length === 9 ? `254${rest}` : null;
  }
  return digits.length === 9 ? `254${digits}` : null;
}

const target = process.argv.slice(2).join(" ");
const phone = parseKenyanPhone(target || process.env.ADMIN_PHONE || "");

if (!phone) {
  console.error("No valid phone number to send to. Pass one, e.g. node scripts/test-termii.mjs 0712 345 678");
  process.exit(1);
}

// Step 2 — actual SMS send.
console.log(`Step 2 · sending test SMS to +${phone} …`);
console.log("");

try {
  const payload = {
    api_key: apiKey,
    to: phone,
    from: senderId,
    sms: "Terava test: this confirms your Termii credentials work.",
    type: "plain",
    channel,
  };

  const response = await fetch(`${baseUrl}/sms/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();

  console.log(`HTTP ${response.status}`);
  console.log(raw);
  console.log("");

  if (response.ok && raw.includes('"code":"ok"')) {
    console.log(`SMS accepted. In sandbox it appears in the Termii dashboard; in live mode it is delivered to the phone.`);
  } else if (response.ok) {
    console.log("Termii returned HTTP 200 but not code 'ok' — check the response above.");
  } else {
    console.log("SMS failed. Common causes:");
    console.log(`  · the sender ID "${senderId}" is not approved on your Termii dashboard (Sender ID → register one)`);
    console.log("  · the API key is wrong, or a sandbox key (TLtest…) is being used on the live host");
    console.log("  · channel 'dnd' needs a DND-whitelisted sender ID — try TERMII_CHANNEL=generic");
  }
} catch (error) {
  console.error("Network error reaching Termii:", error instanceof Error ? error.message : error);
  process.exit(1);
}
