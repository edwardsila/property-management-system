import { parseKenyanPhone } from "@/lib/phone";

export type SmsConfig = {
  username: string;
  apiKey: string;
  senderId: string | null;
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

type AtApiEnvelope = {
  SMSMessageData?: {
    Message?: string;
    requestId?: string;
    Recipients?: Array<{
      statusCode?: string | number;
      statusDescription?: string;
      number?: string;
      cost?: string;
      messageId?: string;
    }>;
  };
  error?: string;
};

const AT_BASE_URL = "https://api.africastalking.com/version1/messaging";

export function getSmsConfig(): SmsConfig | null {
  const username = process.env.AT_USERNAME?.trim();
  const apiKey = process.env.AT_API_KEY?.trim();

  if (!username || !apiKey) {
    return null;
  }

  return { username, apiKey, senderId: process.env.AT_SENDER_ID?.trim() || null };
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
      error: "Africa's Talking SMS is not configured. Set AT_USERNAME and AT_API_KEY.",
    };
  }

  const normalizedTo = parseKenyanPhone(to) ?? to;
  const body = new URLSearchParams();
  body.set("username", config.username);
  body.set("to", normalizedTo);
  body.set("message", message);

  if (config.senderId) {
    body.set("from", config.senderId);
  }

  try {
    const response = await fetch(AT_BASE_URL, {
      method: "POST",
      headers: {
        apiKey: config.apiKey,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const payload = (await response.json().catch(() => null)) as AtApiEnvelope | null;

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        status: "http-error",
        error: payload?.SMSMessageData?.Message || payload?.error || `Africa's Talking returned HTTP ${response.status}`,
      };
    }

    const data = payload?.SMSMessageData;
    const recipient = Array.isArray(data?.Recipients) ? data.Recipients[0] : undefined;
    const statusCode = Number(recipient?.statusCode ?? 101);
    const ok = statusCode === 101;

    return {
      ok,
      statusCode,
      status: ok ? "Success" : recipient?.statusDescription || data?.Message || "Delivery failed",
      messageId: recipient?.messageId,
      requestId: data?.requestId,
      cost: recipient?.cost,
      error: ok ? undefined : recipient?.statusDescription || data?.Message || `Delivery failed (statusCode ${statusCode})`,
    };
  } catch (networkError) {
    return {
      ok: false,
      statusCode: 0,
      status: "network-error",
      error: networkError instanceof Error ? networkError.message : "Network error while contacting Africa's Talking",
    };
  }
}
