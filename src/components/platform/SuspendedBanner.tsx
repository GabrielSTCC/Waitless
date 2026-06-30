"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Company } from "@/lib/types";
import { useTranslations } from "@/components/providers/LocaleProvider";

interface SuspendedBannerProps {
  company: Company;
}

export function SuspendedBanner({ company }: SuspendedBannerProps) {
  const { t } = useTranslations("platform");
  const status = company.platformControl?.status;

  if (status !== "suspended" && status !== "paused") return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-6xl items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            {t(`status.${status}`)} — {t("suspendedBanner")}
          </p>
          {company.platformControl?.reason && (
            <p className="mt-1 text-amber-800/80 dark:text-amber-200/80">
              {company.platformControl.reason}
            </p>
          )}
          <Link
            href="/admin/account"
            className="mt-2 inline-block font-medium text-primary underline-offset-2 hover:underline"
          >
            {t("suspendedBannerLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
