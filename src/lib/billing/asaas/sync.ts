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
    case "DELETED":
      return "canceled";
    default:
      return "none";
  }
}

function isPaidPaymentStatus(status: string): boolean {
  return status === "RECEIVED" || status === "CONFIRMED";
}

function knownBillingInterval(interval: string | undefined): BillingInterval | undefined {
  if (interval === "week" || interval === "month" || interval === "year") return interval;
  return undefined;
}

function knownPlanId(planId: string | undefined): PaidPlanTier | undefined {
  if (planId && isPaidPlanTier(planId)) return planId;
  return undefined;
}

function applyPaidOrCanceled(
  payload: Record<string, unknown>,
  paid: boolean,
  status: SubscriptionStatus,
  planId: PaidPlanTier | undefined,
  interval: BillingInterval | undefined,
  dueDate: string | undefined,
) {
  if (paid && planId) {
    payload.planId = planId;
    if (interval) payload.billingInterval = interval;
    if (dueDate && interval) {
      payload.currentPeriodEnd = Timestamp.fromDate(addBillingPeriod(dueDate, interval));
    }
    return;
  }
  if (status !== "canceled") return;
  payload.planId = "free";
  payload.billingInterval = null;
  payload.billingMarket = null;
  payload.asaasSubscriptionId = null;
  payload.currentPeriodEnd = null;
  payload.pixPendingPaymentId = null;
}

async function resolveAsaasCompanyId(
  db: Firestore,
  payment: AsaasPayment,
  parsedCompanyId: string | null,
): Promise<string | null> {
  // Prefer subscription id lookup when payment has no externalReference yet
  // (Asaas often omits ref on child payments of a subscription).
  if (payment.subscription) {
    const bySubscription = await findCompanyIdByAsaasSubscriptionId(db, payment.subscription);
    if (bySubscription) return bySubscription;
  }
  if (parsedCompanyId) return parsedCompanyId;
  if (payment.customer) return findCompanyIdByAsaasCustomerId(db, payment.customer);
  return null;
}

export async function syncCompanySubscriptionFromAsaasPayment(
  db: Firestore,
  payment: AsaasPayment,
  externalReference?: string | null,
): Promise<void> {
  const ref = externalReference ?? payment.externalReference;
  const parsed = parseAsaasExternalReference(ref);
  const companyId = await resolveAsaasCompanyId(db, payment, parsed?.companyId ?? null);
  if (!companyId) {
    console.warn("[billing/asaas] company not found for payment", payment.id);
    return;
  }

  const status = mapPaymentStatus(payment.status);
  const paid = isPaidPaymentStatus(payment.status);
  const interval = knownBillingInterval(parsed?.interval);
  const planId = knownPlanId(parsed?.planId);
  const payload: Record<string, unknown> = {
    paymentProvider: "asaas",
    asaasCustomerId: payment.customer,
    ...(payment.subscription ? { asaasSubscriptionId: payment.subscription } : {}),
    status: paid ? "active" : status,
    billingMarket: "BR",
    pixPendingPaymentId: paid ? null : payment.id,
  };

  applyPaidOrCanceled(payload, paid, status, planId, interval, payment.dueDate);
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
