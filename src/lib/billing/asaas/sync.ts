import { Timestamp } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";
import type { BillingInterval, PaidPlanTier } from "@/lib/billing/plans";
import { isPaidPlanTier } from "@/lib/billing/plans";
import {
  addBillingPeriod,
  type AsaasPayment,
  getAsaasPayment,
} from "@/lib/billing/asaas/client";
import { parseAsaasExternalReference } from "@/lib/billing/asaas/config";
import {
  findCompanyIdByAsaasCustomerId,
  findCompanyIdByAsaasSubscriptionId,
} from "@/lib/billing/asaas/lookup";
import { recordAsaasPayment } from "@/lib/billing/transaction-ledger";
import type { SubscriptionStatus } from "@/lib/types";

function mapPaymentStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
      return "active";
    case "OVERDUE":
      return "past_due";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
      return "canceled";
    default:
      return "none";
  }
}

function isPaidPaymentStatus(status: string): boolean {
  return status === "RECEIVED" || status === "CONFIRMED";
}

export async function syncCompanySubscriptionFromAsaasPayment(
  db: Firestore,
  payment: AsaasPayment,
  externalReference?: string | null,
): Promise<void> {
  const ref = externalReference ?? payment.externalReference;
  const parsed = parseAsaasExternalReference(ref);
  let companyId = parsed?.companyId ?? null;

  if (!companyId && payment.subscription) {
    companyId = await findCompanyIdByAsaasSubscriptionId(db, payment.subscription);
  }
  if (!companyId && payment.customer) {
    companyId = await findCompanyIdByAsaasCustomerId(db, payment.customer);
  }
  if (!companyId) {
    console.warn("[billing/asaas] company not found for payment", payment.id);
    return;
  }

  const status = mapPaymentStatus(payment.status);
  const paid = isPaidPaymentStatus(payment.status);
  const interval =
    parsed?.interval === "week" ||
    parsed?.interval === "month" ||
    parsed?.interval === "year"
      ? (parsed.interval as BillingInterval)
      : undefined;
  const planId =
    parsed?.planId && isPaidPlanTier(parsed.planId)
      ? (parsed.planId as PaidPlanTier)
      : undefined;

  const payload: Record<string, unknown> = {
    paymentProvider: "asaas",
    asaasCustomerId: payment.customer,
    ...(payment.subscription ? { asaasSubscriptionId: payment.subscription } : {}),
    status: paid ? "active" : status,
    billingMarket: "BR",
    pixPendingPaymentId: paid ? null : payment.id,
  };

  if (paid && planId) {
    payload.planId = planId;
    if (interval) payload.billingInterval = interval;
    if (payment.dueDate && interval) {
      payload.currentPeriodEnd = Timestamp.fromDate(
        addBillingPeriod(payment.dueDate, interval),
      );
    }
  } else if (status === "canceled") {
    payload.planId = "free";
    payload.billingInterval = null;
    payload.billingMarket = null;
    payload.asaasSubscriptionId = null;
    payload.currentPeriodEnd = null;
    payload.pixPendingPaymentId = null;
  }

  await db.doc(`companies/${companyId}`).set({ subscription: payload }, { merge: true });
  await recordAsaasPayment(db, payment);
}

export async function syncCompanySubscriptionFromAsaasWebhook(
  db: Firestore,
  paymentId: string,
  externalReference?: string | null,
): Promise<void> {
  const payment = await getAsaasPayment(paymentId);
  await syncCompanySubscriptionFromAsaasPayment(db, payment, externalReference);
}
