import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import type Stripe from "stripe";
import type { AsaasPayment } from "@/lib/billing/asaas/client";
import { parseAsaasExternalReference } from "@/lib/billing/asaas/config";
import {
  findCompanyIdByAsaasCustomerId,
  findCompanyIdByAsaasSubscriptionId,
} from "@/lib/billing/asaas/lookup";
import {
  findCompanyIdByStripeCustomerId,
  findCompanyIdByStripeSubscriptionId,
} from "@/lib/billing/stripe-sync";
import {
  getStripeInvoiceCustomerId,
  getStripeInvoiceSubscriptionId,
} from "@/lib/billing/stripe-invoice-utils";
import type {
  BillingTransaction,
  BillingTransactionProvider,
  BillingTransactionStatus,
  BillingTransactionSummary,
} from "@/lib/types";

export interface BillingTransactionInput {
  provider: BillingTransactionProvider;
  externalId: string;
  companyId: string;
  companyName: string;
  amountMinor: number;
  currency: "BRL" | "USD";
  status: BillingTransactionStatus;
  rawStatus: string;
  billingType: string;
  planId?: string;
  description?: string;
  occurredAt: Date;
}

export interface BillingTransactionFilters {
  companyId?: string;
  provider?: BillingTransactionProvider;
  status?: BillingTransactionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

const COLLECTION = "billingTransactions";

export function billingTransactionDocId(
  provider: BillingTransactionProvider,
  externalId: string,
): string {
  return `${provider}:${externalId}`;
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date ? date : undefined;
  }
  return undefined;
}

export function normalizeStripeInvoiceStatus(status: string): BillingTransactionStatus {
  switch (status) {
    case "paid":
      return "paid";
    case "open":
    case "draft":
      return "pending";
    case "uncollectible":
    case "void":
      return "failed";
    default:
      return "canceled";
  }
}

export function normalizeAsaasPaymentStatus(status: string): BillingTransactionStatus {
  switch (status) {
    case "RECEIVED":
    case "CONFIRMED":
      return "paid";
    case "PENDING":
      return "pending";
    case "OVERDUE":
      return "failed";
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
      return "refunded";
    case "DELETED":
      return "canceled";
    default:
      return "pending";
  }
}

function mapBillingTypeFromAsaas(billingType: string): string {
  switch (billingType) {
    case "PIX":
      return "pix";
    case "BOLETO":
      return "boleto";
    case "CREDIT_CARD":
      return "card";
    default:
      return billingType.toLowerCase();
  }
}

export function mapStripeInvoiceToTransaction(
  invoice: Stripe.Invoice,
  company: { id: string; name: string },
  planId?: string,
): BillingTransactionInput {
  const currency = (invoice.currency?.toUpperCase() ?? "USD") as "BRL" | "USD";
  const amountMinor =
    invoice.status === "paid"
      ? invoice.amount_paid
      : invoice.amount_due ?? invoice.total ?? 0;
  const paidAt = invoice.status_transitions?.paid_at;
  const occurredAt = paidAt
    ? new Date(paidAt * 1000)
    : new Date((invoice.created ?? Date.now() / 1000) * 1000);

  const billingType =
    invoice.collection_method === "charge_automatically" ? "subscription" : "invoice";

  return {
    provider: "stripe",
    externalId: invoice.id,
    companyId: company.id,
    companyName: company.name,
    amountMinor,
    currency,
    status: normalizeStripeInvoiceStatus(invoice.status ?? "open"),
    rawStatus: invoice.status ?? "unknown",
    billingType,
    planId: planId ?? invoice.metadata?.planId,
    description:
      invoice.description ??
      invoice.lines?.data?.[0]?.description ??
      `Stripe invoice ${invoice.number ?? invoice.id}`,
    occurredAt,
  };
}

export function mapAsaasPaymentToTransaction(
  payment: AsaasPayment,
  company: { id: string; name: string },
  planId?: string,
): BillingTransactionInput {
  const parsed = parseAsaasExternalReference(payment.externalReference);
  const dueDate = payment.dueDate ? new Date(`${payment.dueDate}T12:00:00`) : new Date();

  return {
    provider: "asaas",
    externalId: payment.id,
    companyId: company.id,
    companyName: company.name,
    amountMinor: Math.round(payment.value * 100),
    currency: "BRL",
    status: normalizeAsaasPaymentStatus(payment.status),
    rawStatus: payment.status,
    billingType: mapBillingTypeFromAsaas(payment.billingType),
    planId: planId ?? parsed?.planId,
    description: `Asaas ${payment.billingType} · ${payment.dueDate}`,
    occurredAt: dueDate,
  };
}

export function mapBillingTransactionDoc(
  id: string,
  data: FirebaseFirestore.DocumentData,
): BillingTransaction {
  return {
    id,
    provider: data.provider as BillingTransactionProvider,
    externalId: data.externalId as string,
    companyId: data.companyId as string,
    companyName: data.companyName as string,
    amountMinor: data.amountMinor as number,
    currency: data.currency as "BRL" | "USD",
    status: data.status as BillingTransactionStatus,
    rawStatus: data.rawStatus as string,
    billingType: data.billingType as string,
    planId: data.planId as string | undefined,
    description: data.description as string | undefined,
    occurredAt: toDate(data.occurredAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

export async function upsertBillingTransaction(
  db: Firestore,
  input: BillingTransactionInput,
): Promise<string> {
  const docId = billingTransactionDocId(input.provider, input.externalId);
  const ref = db.collection(COLLECTION).doc(docId);

  await ref.set(
    {
      provider: input.provider,
      externalId: input.externalId,
      companyId: input.companyId,
      companyName: input.companyName,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: input.status,
      rawStatus: input.rawStatus,
      billingType: input.billingType,
      planId: input.planId ?? null,
      description: input.description ?? null,
      occurredAt: Timestamp.fromDate(input.occurredAt),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return docId;
}

async function loadCompanyContext(
  db: Firestore,
  companyId: string,
): Promise<{ id: string; name: string; planId?: string } | null> {
  const snap = await db.doc(`companies/${companyId}`).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  const subscription = data.subscription as { planId?: string } | undefined;
  return {
    id: snap.id,
    name: (data.name as string) ?? snap.id,
    planId: subscription?.planId,
  };
}

export async function resolveCompanyFromStripeInvoice(
  db: Firestore,
  invoice: Stripe.Invoice,
): Promise<{ id: string; name: string; planId?: string } | null> {
  const metadataCompanyId = invoice.metadata?.companyId;
  if (metadataCompanyId) {
    return loadCompanyContext(db, metadataCompanyId);
  }

  const subscriptionId = getStripeInvoiceSubscriptionId(invoice);

  if (subscriptionId) {
    const companyId = await findCompanyIdByStripeSubscriptionId(db, subscriptionId);
    if (companyId) return loadCompanyContext(db, companyId);
  }

  const customerId = getStripeInvoiceCustomerId(invoice);

  if (customerId) {
    const companyId = await findCompanyIdByStripeCustomerId(db, customerId);
    if (companyId) return loadCompanyContext(db, companyId);
  }

  return null;
}

export async function resolveCompanyFromAsaasPayment(
  db: Firestore,
  payment: AsaasPayment,
): Promise<{ id: string; name: string; planId?: string } | null> {
  const parsed = parseAsaasExternalReference(payment.externalReference);
  if (parsed?.companyId) {
    return loadCompanyContext(db, parsed.companyId);
  }

  if (payment.subscription) {
    const companyId = await findCompanyIdByAsaasSubscriptionId(db, payment.subscription);
    if (companyId) return loadCompanyContext(db, companyId);
  }

  if (payment.customer) {
    const companyId = await findCompanyIdByAsaasCustomerId(db, payment.customer);
    if (companyId) return loadCompanyContext(db, companyId);
  }

  return null;
}

export async function recordStripeInvoice(
  db: Firestore,
  invoice: Stripe.Invoice,
): Promise<void> {
  const company = await resolveCompanyFromStripeInvoice(db, invoice);
  if (!company) {
    console.warn("[billing/ledger] company not found for Stripe invoice", invoice.id);
    return;
  }

  await upsertBillingTransaction(
    db,
    mapStripeInvoiceToTransaction(invoice, company, company.planId),
  );
}

export async function recordAsaasPayment(
  db: Firestore,
  payment: AsaasPayment,
): Promise<void> {
  const company = await resolveCompanyFromAsaasPayment(db, payment);
  if (!company) {
    console.warn("[billing/ledger] company not found for Asaas payment", payment.id);
    return;
  }

  await upsertBillingTransaction(
    db,
    mapAsaasPaymentToTransaction(payment, company, company.planId),
  );
}

function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function matchesDateRange(
  occurredAt: Date,
  dateFrom?: Date,
  dateTo?: Date,
): boolean {
  if (dateFrom && occurredAt.getTime() < dateFrom.getTime()) return false;
  if (dateTo && occurredAt.getTime() > dateTo.getTime()) return false;
  return true;
}

export interface BillingTransactionListResult {
  transactions: BillingTransaction[];
  total: number;
  pendingCount: number;
  failedCount: number;
}

function matchesSummaryFilters(
  tx: BillingTransaction,
  filters: BillingTransactionFilters,
): boolean {
  if (filters.companyId && tx.companyId !== filters.companyId) return false;
  if (filters.provider && tx.provider !== filters.provider) return false;
  return true;
}

export async function listBillingTransactions(
  db: Firestore,
  filters: BillingTransactionFilters = {},
): Promise<BillingTransactionListResult> {
  const page = Math.max(filters.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize ?? 30, 1), 100);

  let query: FirebaseFirestore.Query = db.collection(COLLECTION);

  if (filters.companyId) {
    query = query.where("companyId", "==", filters.companyId);
  } else if (filters.provider) {
    query = query.where("provider", "==", filters.provider);
  } else if (filters.status) {
    query = query.where("status", "==", filters.status);
  }

  const fetchLimit = Math.min(pageSize * page * 3, 500);
  const snap = await query.orderBy("occurredAt", "desc").limit(fetchLimit).get();

  let transactions = snap.docs.map((doc) => mapBillingTransactionDoc(doc.id, doc.data()));

  if (filters.provider && filters.companyId) {
    transactions = transactions.filter((tx) => tx.provider === filters.provider);
  }
  if (filters.status && (filters.companyId || filters.provider)) {
    transactions = transactions.filter((tx) => tx.status === filters.status);
  }
  if (filters.dateFrom || filters.dateTo) {
    transactions = transactions.filter((tx) =>
      matchesDateRange(tx.occurredAt, filters.dateFrom, filters.dateTo),
    );
  }

  const total = transactions.length;
  const pendingCount = transactions.filter((tx) => tx.status === "pending").length;
  const failedCount = transactions.filter((tx) => tx.status === "failed").length;
  const start = (page - 1) * pageSize;
  const pageItems = transactions.slice(start, start + pageSize);

  return { transactions: pageItems, total, pendingCount, failedCount };
}

export async function fetchMonthPaidTransactions(
  db: Firestore,
  filters: BillingTransactionFilters = {},
): Promise<BillingTransaction[]> {
  const monthStart = startOfMonth(new Date());

  const snap = await db
    .collection(COLLECTION)
    .where("status", "==", "paid")
    .orderBy("occurredAt", "desc")
    .limit(500)
    .get();

  return snap.docs
    .map((doc) => mapBillingTransactionDoc(doc.id, doc.data()))
    .filter((tx) => tx.occurredAt.getTime() >= monthStart.getTime())
    .filter((tx) => matchesSummaryFilters(tx, filters));
}

export function buildBillingTransactionSummary(
  listResult: BillingTransactionListResult,
  monthPaidTransactions: BillingTransaction[],
): BillingTransactionSummary {
  let paidRevenueMinor = 0;
  for (const tx of monthPaidTransactions) {
    paidRevenueMinor += tx.amountMinor;
  }

  return {
    paidRevenueMinor,
    paidCount: monthPaidTransactions.length,
    pendingCount: listResult.pendingCount,
    failedCount: listResult.failedCount,
    filteredTotal: listResult.total,
  };
}

export async function getBillingTransactionSummary(
  db: Firestore,
  filters: BillingTransactionFilters = {},
  listResult?: BillingTransactionListResult,
): Promise<BillingTransactionSummary> {
  const resolvedList =
    listResult ?? (await listBillingTransactions(db, { ...filters, page: 1, pageSize: 500 }));
  const monthPaid = await fetchMonthPaidTransactions(db, filters);
  return buildBillingTransactionSummary(resolvedList, monthPaid);
}
