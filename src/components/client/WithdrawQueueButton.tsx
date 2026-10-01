"use client";

import { LogOut } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface WithdrawQueueButtonProps {
  onClick: () => void;
  locale?: Locale;
  /** Sem margem externa — uso dentro de painel de contexto */
  flush?: boolean;
}

export function WithdrawQueueButton({
  onClick,
  locale = "pt-BR",
  flush = false,
}: Readonly<WithdrawQueueButtonProps>) {
  const t = useClientTranslations(locale);

  return (
    <div className={cn(flush ? "flex" : "mx-4 mt-4 flex justify-center")}>
      <button
        type="button"
        onClick={onClick}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-on-error-container/35 bg-error-container px-4 py-2.5 text-sm font-semibold text-on-error-container shadow-surface-input transition-colors hover:brightness-95 md:w-auto"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={2.25} />
        {t("client.withdraw.button")}
      </button>
    </div>
  );
}
