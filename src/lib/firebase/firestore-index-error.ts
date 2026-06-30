export function isFirestoreIndexPendingError(error: unknown): boolean {
  const code = (error as { code?: number })?.code;
  if (code === 9) return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index") ||
    message.includes("The query requires an index")
  );
}

export const EMPTY_BILLING_SUMMARY = {
  paidRevenueMinor: 0,
  paidCount: 0,
  pendingCount: 0,
  failedCount: 0,
  filteredTotal: 0,
} as const;
