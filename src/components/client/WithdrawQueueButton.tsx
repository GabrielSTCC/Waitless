"use client";

import { LogOut } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";

interface WithdrawQueueButtonProps {
  onClick: () => void;
  locale?: Locale;
}

export function WithdrawQueueButton({ onClick, locale = "pt-BR" }: WithdrawQueueButtonProps) {
  const t = useClientTranslations(locale);

  return (
    <div className="mx-4 mt-4 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-lg border border-on-error-container/35 bg-error-container px-4 py-2.5 text-sm font-semibold text-on-error-container shadow-surface-input transition-colors hover:brightness-95"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2.25} />
        {t("client.withdraw.button")}
      </button>
    </div>
  );
}
