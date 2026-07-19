import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function parseSortOrder(value: FormDataEntryValue | null | undefined) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function getString(value: FormDataEntryValue | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}
