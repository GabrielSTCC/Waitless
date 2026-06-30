"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import type { PlatformCompanySummary } from "@/lib/types";
import { getPlanDisplayNameForCompany } from "@/lib/billing/plans";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import {
  PlatformStatusBadge,
  SubscriptionStatusBadge,
} from "@/components/platform/SubscriptionStatusBadge";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface CompaniesTableProps {
  companies: PlatformCompanySummary[];
  className?: string;
}

export function CompaniesTable({ companies, className }: CompaniesTableProps) {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();

  if (companies.length === 0) {
    return (
      <div className={cn(surfaceCard, "p-8 text-center text-sm text-on-surface-variant", className)}>
        {t("noCompanies")}
      </div>
    );
  }

  return (
    <div className={cn(surfaceCard, "overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-xs uppercase tracking-wide text-on-surface-variant">
              <th className="px-4 py-3 font-medium">{t("colName")}</th>
              <th className="px-4 py-3 font-medium">{t("colOwner")}</th>
              <th className="px-4 py-3 font-medium">{t("colPlan")}</th>
              <th className="px-4 py-3 font-medium">{t("colSubscription")}</th>
              <th className="px-4 py-3 font-medium">{t("colPlatform")}</th>
              <th className="px-4 py-3 font-medium">{t("colClients")}</th>
              <th className="px-4 py-3 font-medium">{t("colCreated")}</th>
              <th className="px-4 py-3 font-medium">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const companyForPlan = {
                id: company.id,
                name: company.name,
                ownerId: company.ownerId,
                avgServiceTimeMin: 10,
                toleranceEnabled: false,
                toleranceMin: 5,
                defaultLocale: "pt-BR" as const,
                subscription: company.subscription,
                createdAt: company.createdAt,
              };
              const trialEndsAt = company.subscription?.trialEndsAt;

              return (
                <tr
                  key={company.id}
                  className="border-b border-outline-variant/20 transition-colors hover:bg-surface-container-low/40"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-on-surface">{company.name}</div>
                    <div className="text-xs text-on-surface-variant">{company.id}</div>
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {company.ownerEmail ?? company.ownerId}
                  </td>
                  <td className="px-4 py-3">
                    {getPlanDisplayNameForCompany(companyForPlan, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <SubscriptionStatusBadge status={company.subscription?.status ?? "none"} />
                    {trialEndsAt && (
                      <div className="mt-1 text-[10px] text-on-surface-variant">
                        Trial: {formatDisplayDate(trialEndsAt, locale)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PlatformStatusBadge status={company.platformControl?.status ?? "active"} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{company.clientCount}</td>
                  <td className="px-4 py-3 text-on-surface-variant">
                    {formatDisplayDate(company.createdAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/companies/${company.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant/60 px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t("view")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
