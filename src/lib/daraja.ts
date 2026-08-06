type DarajaConfig = {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  baseUrl: string;
  callbackUrl: string;
  transactionType: string;
};

export type StkPushResult =
  | {
      ok: true;
      merchantRequestId: string;
      checkoutRequestId: string;
      responseDescription: string;
      customerMessage?: string;
    }
  | {
      ok: false;
      error: string;
    };

function getShortCode() {
  return process.env.MPESA_SHORTCODE?.trim() ?? "";
}

export function getDarajaConfig(): DarajaConfig | null {
  const consumerKey = process.env.MPESA_CONSUMER_KEY?.trim() ?? "";
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET?.trim() ?? "";
  const passkey = process.env.MPESA_PASSKEY?.trim() ?? "";
  const shortcode = getShortCode();

  if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
    return null;
  }

  const env = process.env.MPESA_ENV?.trim().toLowerCase() === "live" ? "live" : "sandbox";
  const callbackUrl =
    process.env.MPESA_CALLBACK_URL?.trim() ||
    process.env.BASE_URL?.trim() ||
    "";

  if (!callbackUrl) {
    return null;
  }

  return {
    consumerKey,
    consumerSecret,
    passkey,
    shortcode,
    baseUrl: env === "live" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke",
    callbackUrl,
    transactionType: process.env.MPESA_TRANSACTION_TYPE?.trim() || "CustomerPayBillOnline",
  };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(config: DarajaConfig) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const basic = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const response = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(data?.access_token ? "M-Pesa rejected the Daraja credentials." : "Unable to authenticate with Daraja.");
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3599) * 1000,
  };

  return cachedToken.token;
}

function eatTimestamp() {
  const date = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

export function stkAccountReference(unitName: string | null | undefined) {
  const cleaned = (unitName ?? "RENT").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  return cleaned.slice(0, 12) || "RENT";
}

export async function stkPush({
  phone,
  amount,
  accountReference,
  transactionDesc = "Rent payment",
}: {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc?: string;
}): Promise<StkPushResult> {
  const config = getDarajaConfig();

  if (!config) {
    return { ok: false, error: "M-Pesa payments are not configured yet. Ask the administrator to set the MPESA_* settings." };
  }

  if (!Number.isInteger(amount) || amount < 1 || amount > 150000) {
    return { ok: false, error: "M-Pesa accepts whole amounts between KES 1 and KES 150,000." };
  }

  const token = await getAccessToken(config);
  const timestamp = eatTimestamp();
  const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString("base64");

  const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: config.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: config.transactionType,
      Amount: amount,
      PartyA: phone,
      PartyB: config.shortcode,
      PhoneNumber: phone,
      CallBackURL: `${config.callbackUrl.replace(/\/+$/, "")}/api/integrations/daraja/callback`,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc.slice(0, 13),
    }),
    cache: "no-store",
  });

  const data = (await response.json().catch(() => null)) as
    | { ResponseCode?: string; MerchantRequestID?: string; CheckoutRequestID?: string; ResponseDescription?: string; CustomerMessage?: string; errorCode?: string; errorMessage?: string }
    | null;

  if (!response.ok) {
    return { ok: false, error: data?.errorMessage ?? data?.errorCode ?? `M-Pesa request failed (${response.status}).` };
  }

  if (data?.ResponseCode && data.ResponseCode !== "0") {
    return { ok: false, error: data.ResponseDescription ?? data.ResponseCode };
  }

  if (!data?.CheckoutRequestID) {
    return { ok: false, error: "M-Pesa returned no checkout request." };
  }

  return {
    ok: true,
    merchantRequestId: data.MerchantRequestID ?? "",
    checkoutRequestId: data.CheckoutRequestID,
    responseDescription: data.ResponseDescription ?? "",
    customerMessage: data.CustomerMessage,
  };
}
