import { prisma } from "@/lib/prisma";
import { sendSms, isSmsConfigured } from "@/lib/termii";
import { formatDate, formatMoney } from "@/lib/rental";

export type MessageType = "RENT_DUE" | "BALANCE" | "PAYMENT_RECEIVED" | "MANUAL";
export type MessageChannel = "SMS" | "EMAIL";

export type MessageContext = {
  tenantName: string;
  unitName: string | null;
  monthlyRent: number;
  balance: number;
  dueDate: Date;
  customBody?: string;
  amount?: number;
};

export function composeMessageBody(type: MessageType, context: MessageContext) {
  const unit = context.unitName ?? "your unit";

  switch (type) {
    case "RENT_DUE":
      return `Hi ${context.tenantName}, your rent of ${formatMoney(context.monthlyRent)} for ${unit} is due by ${formatDate(context.dueDate)}. Please pay on time to keep your account in good standing.`;
    case "BALANCE":
      return `Hi ${context.tenantName}, your outstanding balance for ${unit} is ${formatMoney(Math.max(0, context.balance))}. Kindly settle your account soon.`;
    case "PAYMENT_RECEIVED":
      return context.amount
        ? `Hi ${context.tenantName}, we confirm receipt of ${formatMoney(context.amount)} for ${unit}. Thank you.`
        : `Hi ${context.tenantName}, we confirm receipt of your payment for ${unit}. Thank you.`;
    default:
      return context.customBody ?? "";
  }
}

export async function deliverMessage(messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message) {
    return null;
  }

  if (message.channel !== "SMS") {
    return prisma.message.update({
      where: { id: messageId },
      data: { status: "SENT", sentAt: new Date(), provider: "simulated", error: null },
    });
  }

  if (!isSmsConfigured()) {
    return prisma.message.update({
      where: { id: messageId },
      data: { status: "SENT", sentAt: new Date(), provider: "simulated", error: null },
    });
  }

  const tenant = message.tenantId ? await prisma.tenant.findUnique({ where: { id: message.tenantId } }) : null;

  if (!tenant?.phone) {
    return prisma.message.update({
      where: { id: messageId },
      data: { status: "FAILED", provider: "termii", error: "Tenant has no phone number" },
    });
  }

  const result = await sendSms(tenant.phone, message.body);

  if (result.ok) {
    return prisma.message.update({
      where: { id: messageId },
      data: { status: "SENT", sentAt: new Date(), provider: "termii", error: null },
    });
  }

  return prisma.message.update({
    where: { id: messageId },
    data: { status: "FAILED", provider: "termii", error: result.error ?? result.status ?? "SMS delivery failed" },
  });
}
