# Property Manager Guide

This guide explains how to use the property management system day-to-day as a
property manager (the "Agent/Caretaker" role) or as the system owner. It covers
logging in, the sections you work with, and how M-Pesa rent and deposit payments
flow through the system.

## 1. Logging in

Open the admin dashboard at `/admin`.

- Enter your phone number and tap **Get code**. A one-time code is sent to that
  phone by SMS.
- Enter the code to finish signing in.
- First-time setup: the very first login uses the `ADMIN_PHONE` environment
  variable. That number becomes the default Owner account.
- Both Owners and Agents/Caretakers sign in at the same `/admin` screen.

There is a separate tenant-facing portal at `/portal`, where tenants sign in
with the same phone-OTP flow.

### Roles

| Role | What you can do |
| --- | --- |
| **Owner** | Everything: all sections, all properties, full edit/delete, paybill configuration, reports, expenses, staff, messages. |
| **Agent / Caretaker** | Day-to-day running of the property(ies) assigned to you: Tenants, Leases (read-only), Payments, Maintenance, and read-only Units. You do **not** see Properties, Incoming, Reports, Expenses, Messages, or Staff. |

Each agent is assigned to specific properties by the owner. You will only ever
see units, tenants, leases, and payments belonging to your assigned properties.

## 2. Your workspace

The dashboard has a sidebar with the sections available to your role.

### Units (read-only for agents)
The list of units at your property: name, type, floor, rent, deposit, current
status, and who occupies it. Owners create/edit units here and in the
Properties section. Unit statuses:

- **VACANT** — no active lease.
- **RESERVED** — a lease has been created (DRAFT) and money has started to come
  in for the unit; it is held for the incoming tenant.
- **OCCUPIED** — an active lease is running.
- **MAINTENANCE** — out of service.

### Tenants
Every occupant must exist as a tenant first. Create a tenant with name, phone,
and email **before** creating a lease.

> Enter the tenant's phone number exactly as it is registered with M-Pesa.
> Phone is how the system matches incoming M-Pesa payments to the right person.

### Leases (read-only for agents)
A lease connects a tenant to a unit: start date, monthly rent, and the deposit
amount. Owners create leases. A new lease is created in **DRAFT** and becomes
**ACTIVE** automatically once the first full rent payment clears (see
"Deposits and the new-tenant flow" below).

### Payments
Record cash, bank, or M-Pesa payments against a lease. Create a payment by
selecting the lease, the method, the amount, and the date, then toggle **Send
SMS** if you want the tenant to receive a receipt. The system splits the amount
into deposit and rent automatically (see "How payments are split").

### Maintenance
Log repairs and issues per unit. Set a priority from 1 (lowest) to 5 (highest)
and track status through OPEN → IN_PROGRESS → AWAITING_APPROVAL → RESOLVED →
CLOSED.

## 3. How M-Pesa money flows

M-Pesa payments are matched using three pieces of information:

1. **Paybill number** → which property the money is for.
2. **Account reference** → which unit it is for (the unit's payment account
   reference, unit code, or unit name, compared case- and symbol-insensitively).
3. **Phone number** → which tenant it is from.

The tenant portal shows the exact **Paybill** and **Account number** for each
lease, so tenants can pay straight from the M-Pesa app (`Lipa na M-Pesa →
Paybill`). Tenants can also enter an amount in the portal and get an **STK push**
on their phone to approve the payment.

When a payment arrives it goes through these stages:

1. **Pending push** — for STK payments, a temporary record is created while the
   tenant is approving the request.
2. **Incoming payment** — the money has arrived via C2B or STK callback. The
   system tries to match it automatically. If it matches, it is reconciled, the
   payment is recorded, and a receipt SMS is sent.
3. **Recorded payment** — visible in the Payments section with its deposit/rent
   split.
4. If it **cannot** be matched automatically, it sits in the **Incoming** list
   (owner-only) waiting for someone to confirm or discard it.

## 4. Incoming payments and reconciling the queue

The **Incoming payments** section (owner-only) lists M-Pesa and bank payments
that have not been matched.

- **Auto-matched** payments are reconciled immediately — you normally never see
  them here.
- **Unmatched** payments wait in this queue. The list shows the amount, the
  phone, and (when it can be linked to one) the unit. Confirm them manually, or
  discard them if they are not for you.
- A payment made for a unit that has **no tenant or lease yet** is matched to
  the unit and labelled *"Deposit held for unit X — awaiting a lease."* It is
  kept safe and applied automatically once the tenant and lease are created.

Common reasons a payment stays unmatched:

- The paybill number is not configured for any property (the C2B validation
  step rejects unknown shortcodes).
- The account reference does not match any unit's payment account ref, unit
  code, or unit name.
- The tenant is not registered with a matching phone number.

Fix the cause (register the tenant, correct the unit ref, set up the property's
paybill) and the payment can be matched and reconciled.

## 5. How payments are split (deposit vs rent)

Every payment gets an allocation:

| Allocation | Meaning |
| --- | --- |
| **DEPOSIT** | The whole amount counts toward the lease deposit. |
| **RENT** | The whole amount counts toward rent. |
| **MIXED** | Part fills the outstanding deposit; the rest counts as rent. |

Deposits are always filled **first**: if a lease has a KES 5,000 deposit and
the first payment is KES 20,000, KES 5,000 is recorded as deposit and KES
15,000 as rent.

**Balances, arrears, and rent statements only count the rent portion.**
A tenant with the deposit fully paid but rent outstanding is still shown as in
arrears. The deposit itself never reduces what the tenant owes in rent.

## 6. Deposits and the new-tenant flow

This is how a brand-new tenant moves in:

1. **Owner configures the property** — paybill number + passkey on the
   property form, so payments route to the right place.
2. **Owner creates the unit** — a unit needs a payment account reference so
   payments can be matched to it.
3. **Create the tenant** in Tenants (name, phone, email).
4. **Owner creates the lease** as DRAFT (tenant + unit + rent + deposit +
   start date). This reserves the unit (**RESERVED**).
5. **The tenant pays.** They can pay even before the lease exists:
   - If the money arrives while the unit is **vacant with no tenant**, it is
     held as *"Deposit held for unit X — awaiting a lease."*
   - Once the tenant and lease exist, held payments are **applied
     automatically** (matched by phone), with the deposit filled first.
6. **The lease activates on its own.** As soon as the **first full rent**
   clears (`rent paid ≥ monthly rent`):
   - Lease status changes DRAFT → **ACTIVE**
   - Unit status changes RESERVED → **OCCUPIED**
   - The move-in date is set
   - The tenant gets a **welcome SMS**

Until the first full rent clears, the lease stays DRAFT and the unit stays
RESERVED — nothing is activated early. This guarantees no one is moved in until
the first month's rent is actually received.

> Tip: to let a tenant pay before a lease exists, make sure their phone number
> is saved on the tenant record and the unit already has a payment account
> reference. Held payments are attached to tenants by phone.

## 7. SMS receipts and reminders

The system sends SMS automatically when configured:

- **Payment receipt** — after a payment is reconciled. The message is tailored
  to the situation:
  - **Deposit still due** — tells the tenant how much deposit is still owed.
  - **Balance remains** — confirms the payment and shows the remaining
    balance / next due date.
  - **Fully settled** — confirms the account is clear and mentions arrears
    that have been cleared, if any.
- **Welcome SMS** — when a lease activates on first rent.
- **Test SMS** — owners can send a test from the Tenants section.

If SMS sending is not configured (no Termii key), receipts are logged instead
of sent.

## 8. The tenant portal

Tenants sign in at `/portal` with their phone. They see:

- Their paybill number and account reference, with steps to pay from the M-Pesa
  app.
- A box to enter an amount and trigger an **STK push** to their own phone.
- Their lease's **deposit** (paid vs required) and **rent** balances, plus
  payment history.

## 9. Owner-only configuration you should know about

As an agent you will not see these, but it helps to understand them:

- **Properties** — create properties and set the live **paybill number** and
  **passkey** per property. This is what makes M-Pesa payments land.
- **Reports / Expenses / Messages / Staff / Inquiries** — owner-facing
  reporting and admin.
- **Incoming payments** — the reconciliation queue described above.

## 10. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| A payment sits in Incoming, unmatched. | Paybill doesn't match a property; account ref doesn't match a unit; or no tenant with that phone. Fix and reconfirm. |
| Lease stays DRAFT forever. | The first full rent has not cleared. Check Payments — the rent portion must reach the monthly rent. |
| Deposit shows "still due" after payment. | The deposit is filled before rent; if the payment was smaller than the deposit it counts fully as deposit. |
| Balance/arrears look high despite payments. | Only the **rent** portion counts toward balances; deposit payments don't reduce rent owed. |
| No SMS received. | SMS provider not configured — receipts are logged instead. Check the owner's configuration. |
| Tenant can't pay in the portal. | The property needs a paybill number/passkey and M-Pesa must be configured for live (production) use. |

## 11. Go-live checklist (for the owner)

Before real money moves, confirm:

- [ ] Daraja app keys set (`MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET`,
      `MPESA_ENV=production`).
- [ ] Each property has its live **paybill number** and **passkey** saved in the
      property form.
- [ ] C2B callbacks are registered in the Daraja dashboard at
      `/api/integrations/daraja/c2b/validation` and
      `/api/integrations/daraja/c2b/confirmation`.
- [ ] `MPESA_CALLBACK_URL` points to `/api/integrations/daraja/callback`.
- [ ] `CRON_SECRET` is set and `/api/cron/daraja-reconcile` is scheduled
      (e.g. every few minutes) with `Authorization: Bearer $CRON_SECRET`.
- [ ] `MPESA_CALLBACK_SECRET` is **left unset**. Safaricom cannot send custom
      headers on C2B callbacks, so enabling it rejects real payments.
- [ ] `BASE_URL` and `AUTH_SECRET` are set, and SMS (Termii) / email (Resend)
      keys are in place if notifications should be delivered.
