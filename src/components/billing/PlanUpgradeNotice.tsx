"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";

interface PlanUpgradeNoticeProps {
  feature: "analytics" | "analyticsFull" | "tolerance" | "branding" | "whatsappApi" | "staff" | "monthlyLimit";
  className?: string;
}

export function PlanUpgradeNotice({ feature, className }: PlanUpgradeNoticeProps) {
  const { t } = useTranslations("billing");

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm",
        className,
      )}
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
      <div className="min-w-0">
        <p className="font-medium text-on-surface">{t(`upgrade.${feature}.title`)}</p>
        <p className="mt-0.5 text-on-surface-variant">{t(`upgrade.${feature}.body`)}</p>
        <Link
          href="/admin/account"
          className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
        >
          {t("upgrade.cta")}
        </Link>
      </div>
    </div>
  );
}
