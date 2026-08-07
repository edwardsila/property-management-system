import { prisma } from "@/lib/prisma";
import { sendSms, isSmsConfigured } from "@/lib/termii";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { formatDate, formatMoney } from "@/lib/rental";

export type MessageType = "RENT_DUE" | "BALANCE" | "PAYMENT_RECEIVED" | "LEASE_ACTIVATED" | "MANUAL";
export type MessageChannel = "SMS" | "EMAIL";

export type MessageContext = {
  tenantName: string;
  unitName: string | null;
  monthlyRent: number;
  balance: number;
  balanceBefore?: number;
  dueDate: Date;
  customBody?: string;
  amount?: number;
  depositPaid?: number;
  depositRequired?: number;
  paybillNumber?: string | null;
  accountReference?: string | null;
};

export function composeMessageBody(type: MessageType, context: MessageContext) {
  const unit = context.unitName ?? "your unit";

  const paymentDetails =
    context.paybillNumber && context.accountReference
      ? ` Pay via Paybill ${context.paybillNumber}, account ${context.accountReference}.`
      : "";

  switch (type) {
    case "RENT_DUE":
      return `Hi ${context.tenantName}, your rent of ${formatMoney(context.monthlyRent)} for ${unit} is due by ${formatDate(context.dueDate)}. Please pay on time to keep your account in good standing.${paymentDetails}`;
    case "BALANCE":
      return `Hi ${context.tenantName}, your outstanding balance for ${unit} is ${formatMoney(Math.max(0, context.balance))}. Kindly settle your account soon.${paymentDetails}`;
    case "PAYMENT_RECEIVED": {
      if (!context.amount) {
        return `Hi ${context.tenantName}, we confirm receipt of your payment for ${unit}. Thank you.${paymentDetails}`;
      }

      const depositStillDue =
        context.depositRequired != null && context.depositPaid != null
          ? Math.max(0, context.depositRequired - context.depositPaid)
          : 0;

      if (depositStillDue > 0) {
        return `Hi ${context.tenantName}, we confirm receipt of ${formatMoney(context.amount)} for ${unit}. This counts towards your deposit; ${formatMoney(depositStillDue)} of the deposit is still due. Your unit will be activated once your first rent of ${formatMoney(context.monthlyRent)} is paid.${paymentDetails}`;
      }

      const due = context.dueDate ? formatDate(context.dueDate) : "";
      const balanceAfter = Math.max(0, context.balance);
      const hadArrears = (context.balanceBefore ?? balanceAfter) > 0;

      if (balanceAfter <= 0) {
        const cleared = hadArrears ? " Your arrears are now fully cleared." : "";
        return `Hi ${context.tenantName}, we confirm receipt of ${formatMoney(context.amount)} for ${unit}. Your rent for ${unit} is fully settled.${cleared} Next rent due ${due}.${paymentDetails}`;
      }

      return `Hi ${context.tenantName}, we confirm receipt of ${formatMoney(context.amount)} for ${unit}. Your outstanding balance is ${formatMoney(balanceAfter)}, due by ${due}.${paymentDetails}`;
    }
    case "LEASE_ACTIVATED": {
      const due = context.dueDate ? formatDate(context.dueDate) : "";
      return `Hi ${context.tenantName}, your first rent for ${unit} is fully paid. Your unit is now active — welcome in! Your next rent of ${formatMoney(context.monthlyRent)} is due by ${due}.${paymentDetails}`;
    }
    default:
      return context.customBody ?? "";
  }
}

export function composeMessageSubject(type: MessageType) {
  switch (type) {
    case "RENT_DUE":
      return "Rent due reminder";
    case "BALANCE":
      return "Outstanding rent balance";
    case "PAYMENT_RECEIVED":
      return "Payment received";
    case "LEASE_ACTIVATED":
      return "Welcome to your new unit";
    default:
      return "";
  }
}

export async function deliverMessage(messageId: string) {
  const message = await prisma.message.findUnique({ where: { id: messageId } });

  if (!message) {
    return null;
  }

  const tenant = message.tenantId ? await prisma.tenant.findUnique({ where: { id: message.tenantId } }) : null;

  if (message.channel === "EMAIL") {
    if (!isEmailConfigured()) {
      return prisma.message.update({
        where: { id: messageId },
        data: { status: "SENT", sentAt: new Date(), provider: "simulated", error: null },
      });
    }

    if (!tenant?.email) {
      return prisma.message.update({
        where: { id: messageId },
        data: { status: "FAILED", provider: "resend", error: "Tenant has no email address" },
      });
    }

    const subject = message.subject ?? composeMessageSubject(message.type) ?? "Terava Properties";

    const result = await sendEmail({ to: tenant.email, subject, text: message.body });

    if (result.ok) {
      return prisma.message.update({
        where: { id: messageId },
        data: { status: "SENT", sentAt: new Date(), provider: "resend", error: null },
      });
    }

    return prisma.message.update({
      where: { id: messageId },
      data: { status: "FAILED", provider: "resend", error: result.error ?? result.status ?? "Email delivery failed" },
    });
  }

  if (!isSmsConfigured()) {
    return prisma.message.update({
      where: { id: messageId },
      data: { status: "SENT", sentAt: new Date(), provider: "simulated", error: null },
    });
  }

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
