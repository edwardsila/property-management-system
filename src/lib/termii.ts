import { parseKenyanPhone } from "@/lib/phone";

export type SmsConfig = {
  apiKey: string;
  senderId: string;
  baseUrl: string;
  channel: "generic" | "dnd";
};

export type SmsResult = {
  ok: boolean;
  statusCode: number;
  status: string;
  messageId?: string;
  requestId?: string;
  cost?: string;
  error?: string;
};

type TermiiEnvelope = {
  code?: string;
  message?: string;
  message_id?: string;
  balance?: number;
  user?: string;
};

const TERMII_LIVE_URL = "https://api.ng.termii.com/api";
const TERMII_SANDBOX_URL = "https://api.termii.com/api";

export function termiiBaseUrl(apiKey: string) {
  const override = process.env.TERMII_BASE_URL?.trim();

  if (override) {
    return override.replace(/\/+$/, "");
  }

  // Sandbox keys are prefixed TLtest; they only authenticate on the sandbox host.
  return apiKey.startsWith("TLtest") ? TERMII_SANDBOX_URL : TERMII_LIVE_URL;
}

export function getSmsConfig(): SmsConfig | null {
  const apiKey = process.env.TERMII_API_KEY?.trim();
  const senderId = process.env.TERMII_SENDER_ID?.trim();

  if (!apiKey || !senderId) {
    return null;
  }

  const channel = process.env.TERMII_CHANNEL?.trim() === "dnd" ? "dnd" : "generic";

  return { apiKey, senderId, baseUrl: termiiBaseUrl(apiKey), channel };
}

export function isSmsConfigured() {
  return getSmsConfig() !== null;
}

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const config = getSmsConfig();

  if (!config) {
    return {
      ok: false,
      statusCode: 0,
      status: "unconfigured",
      error: "Termii SMS is not configured. Set TERMII_API_KEY and TERMII_SENDER_ID.",
    };
  }

  const normalizedTo = (parseKenyanPhone(to) ?? to).replace(/^\+/, "");

  const payload = {
    api_key: config.apiKey,
    to: normalizedTo,
    from: config.senderId,
    sms: message,
    type: "plain",
    channel: config.channel,
  };

  try {
    const url = `${config.baseUrl}/sms/send`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json().catch(() => null)) as TermiiEnvelope | null;

    if (!response.ok) {
      const providerMessage = data?.message || data?.code || "";
      const error =
        providerMessage ||
        `Termii returned HTTP ${response.status} (username/sender "${config.senderId}" on ${config.baseUrl}). Check TERMII_API_KEY and TERMII_SENDER_ID in .env* and that the sender ID is approved on your Termii dashboard.`;

      return {
        ok: false,
        statusCode: response.status,
        status: "http-error",
        error,
      };
    }

    const ok = data?.code === "ok";

    return {
      ok,
      statusCode: response.status,
      status: ok ? data?.message ?? "Success" : data?.message ?? "Delivery failed",
      messageId: data?.message_id,
      requestId: data?.message_id,
      cost: data?.balance != null ? String(data.balance) : undefined,
      error: ok ? undefined : data?.message ?? `Delivery failed (code ${data?.code ?? "unknown"})`,
    };
  } catch (networkError) {
    return {
      ok: false,
      statusCode: 0,
      status: "network-error",
      error: networkError instanceof Error ? networkError.message : "Network error while contacting Termii",
    };
  }
}

export async function checkBalance(): Promise<{ ok: boolean; balance?: number; currency?: string; error?: string }> {
  const config = getSmsConfig();

  if (!config) {
    return { ok: false, error: "Termii is not configured. Set TERMII_API_KEY and TERMII_SENDER_ID." };
  }

  for (const endpoint of ["/get-balance", "/check/balance", "/insight/balance"]) {
    try {
      const url = `${config.baseUrl}${endpoint}?api_key=${encodeURIComponent(config.apiKey)}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const raw = await response.text();

      if (response.ok) {
        const data = JSON.parse(raw) as { balance?: string | number; currency?: string } | null;
        const balance = typeof data?.balance === "number" ? data.balance : Number(data?.balance);
        return { ok: true, balance: Number.isFinite(balance) ? balance : undefined, currency: data?.currency };
      }
    } catch {
      // Try the next balance endpoint before giving up.
    }
  }

  return { ok: false, error: "Could not fetch Termii balance (tried /get-balance, /check/balance and /insight/balance)." };
}
