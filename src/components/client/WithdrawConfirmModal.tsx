"use client";

import { Loader2 } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";

interface WithdrawConfirmModalProps {
  open: boolean;
  loading: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  locale?: Locale;
}

export function WithdrawConfirmModal({
  open,
  loading,
  error,
  onConfirm,
  onCancel,
  locale = "pt-BR",
}: WithdrawConfirmModalProps) {
  const t = useClientTranslations(locale);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container p-6 shadow-xl">
        <h2 className="font-heading text-lg font-bold text-on-surface">
          {t("client.withdraw.confirmTitle")}
        </h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {t("client.withdraw.confirmBody")}
        </p>
        {error && <p className="mt-3 text-sm text-error">{error}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-error px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("client.withdraw.confirmAction")}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex flex-1 rounded-xl border border-outline-variant px-4 py-3 text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:opacity-60"
          >
            {t("client.withdraw.cancelAction")}
          </button>
        </div>
      </div>
    </div>
  );
}
