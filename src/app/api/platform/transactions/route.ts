import { NextRequest, NextResponse } from "next/server";
import {
  buildBillingTransactionSummary,
  fetchMonthPaidTransactions,
  listBillingTransactions,
} from "@/lib/billing/transaction-ledger";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import {
  EMPTY_BILLING_SUMMARY,
  isFirestoreIndexPendingError,
} from "@/lib/firebase/firestore-index-error";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import type {
  BillingTransactionProvider,
  BillingTransactionStatus,
} from "@/lib/types";

export const runtime = "nodejs";

function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "30"), 100);
  const companyId = searchParams.get("companyId")?.trim() || undefined;
  const provider = searchParams.get("provider")?.trim() as
    | BillingTransactionProvider
    | undefined;
  const status = searchParams.get("status")?.trim() as BillingTransactionStatus | undefined;
  const dateFrom = parseDateParam(searchParams.get("dateFrom"));
  const dateTo = parseDateParam(searchParams.get("dateTo"));

  const filters = {
    companyId,
    provider: provider === "stripe" || provider === "asaas" ? provider : undefined,
    status:
      status === "paid" ||
      status === "pending" ||
      status === "failed" ||
      status === "refunded" ||
      status === "canceled"
        ? status
        : undefined,
    dateFrom,
    dateTo,
    page,
    pageSize,
  };

  try {
    const db = getAdminDb();
    const listResult = await listBillingTransactions(db, filters);
    const monthPaid = await fetchMonthPaidTransactions(db, filters);
    const summary = buildBillingTransactionSummary(listResult, monthPaid);

    return NextResponse.json({
      transactions: listResult.transactions.map((tx) => ({
        ...tx,
        occurredAt: tx.occurredAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
      })),
      total: listResult.total,
      page,
      pageSize,
      summary,
      indexPending: false,
    });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }

    if (isFirestoreIndexPendingError(error)) {
      return NextResponse.json({
        transactions: [],
        total: 0,
        page,
        pageSize,
        summary: { ...EMPTY_BILLING_SUMMARY },
        indexPending: true,
      });
    }

    console.error("[platform/transactions]", error);
    return NextResponse.json({ error: "Erro ao carregar transações." }, { status: 500 });
  }
}
