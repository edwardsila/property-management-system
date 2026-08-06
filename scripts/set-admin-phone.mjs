// Set the phone number that receives admin login codes.
//
// Usage:
//   node scripts/set-admin-phone.mjs "0712 345 678"
//   node scripts/set-admin-phone.mjs "+254712345678"
//
// The admin user is upserted by email (owner@property.local by default).
// Any pending login code is cleared when the number changes.

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const DB_PATH = join(ROOT, "prisma", "dev.db");
const ADMIN_EMAIL = "owner@property.local";

if (!existsSync(DB_PATH)) {
  console.error(`Database not found at ${DB_PATH}`);
  process.exit(1);
}

function parseKenyanPhone(input) {
  const digits = input.replace(/[\s().\-]/g, "").replace(/^\+/, "");

  if (!/^\d+$/.test(digits)) {
    return null;
  }

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

const raw = process.argv[2] && process.argv[2].trim();
const phone = parseKenyanPhone(raw ?? "");

if (!phone || !/^254[17][0-9]{8}$/.test(phone)) {
  console.error("Enter a valid Kenyan mobile number (e.g. 0712 345 678 or +254712345678).");
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const row = db.prepare("SELECT id FROM User WHERE email = ?").get(ADMIN_EMAIL);
const now = new Date().toISOString();

let userId;
if (row) {
  userId = row.id;
} else {
  userId = randomUUID();
  db.prepare(
    'INSERT INTO User (id, name, email, role, "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, "Default Owner", ADMIN_EMAIL, "OWNER", now, now);
}

db.prepare('UPDATE User SET phone = ?, "otpCodeHash" = NULL, "otpExpiresAt" = NULL, "updatedAt" = ? WHERE id = ?').run(
  phone,
  now,
  userId,
);

db.close();

console.log(`Admin phone set to +${phone} for ${ADMIN_EMAIL}`);
console.log("Sign in at http://localhost:3000/admin");
