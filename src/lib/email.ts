export type EmailConfig = {
  apiKey: string;
  from: string;
};

export type EmailResult = {
  ok: boolean;
  statusCode: number;
  status: string;
  id?: string;
  error?: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return null;
  }

  return { apiKey, from };
}

export function isEmailConfigured() {
  return getEmailConfig() !== null;
}

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<EmailResult> {
  const config = getEmailConfig();

  if (!config) {
    return {
      ok: false,
      statusCode: 0,
      status: "unconfigured",
      error: "Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject,
        text,
      }),
      cache: "no-store",
    });

    const data = (await response.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;

    if (!response.ok) {
      const providerMessage = data?.message || data?.name || "";
      const error =
        providerMessage ||
        `Resend returned HTTP ${response.status}. Check RESEND_API_KEY and EMAIL_FROM and that the sender is verified on your Resend dashboard.`;

      return { ok: false, statusCode: response.status, status: "http-error", error };
    }

    return { ok: true, statusCode: response.status, status: "sent", id: data?.id };
  } catch (networkError) {
    return {
      ok: false,
      statusCode: 0,
      status: "network-error",
      error: networkError instanceof Error ? networkError.message : "Network error while contacting Resend",
    };
  }
}
