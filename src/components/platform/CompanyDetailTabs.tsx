"use client";

import Link from "next/link";
import { useState } from "react";
import type { CompanyDetail } from "@/lib/platform/companies";
import { getEffectivePlanId } from "@/lib/billing/plan-limits";
import { getPlanDisplayName } from "@/lib/billing/plans";
import { getRoleLabel } from "@/lib/permissions";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsSection } from "@/components/settings/SettingsSection";
import {
  PlatformStatusBadge,
  SubscriptionStatusBadge,
} from "@/components/platform/SubscriptionStatusBadge";
import { PlatformPlanChangeForm } from "@/components/platform/PlatformPlanChangeForm";
import { formatDisplayDate } from "@/lib/utils/format-date";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";
import { Building2, CreditCard, Users } from "lucide-react";

interface CompanyDetailTabsProps {
  company: CompanyDetail;
  onSubscriptionUpdated?: (company: CompanyDetail) => void;
}

type TabId = "overview" | "subscription" | "team" | "clients";

export function CompanyDetailTabs({ company, onSubscriptionUpdated }: CompanyDetailTabsProps) {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();
  const [tab, setTab] = useState<TabId>("overview");

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: t("tabs.overview") },
    { id: "subscription", label: t("tabs.subscription") },
    { id: "team", label: t("tabs.team") },
    { id: "clients", label: t("tabs.clients") },
  ];

  const planId = getEffectivePlanId({
    id: company.id,
    name: company.name,
    ownerId: company.ownerId,
    avgServiceTimeMin: 10,
    toleranceEnabled: false,
    toleranceMin: 5,
    defaultLocale: "pt-BR",
    subscription: company.subscription,
    createdAt: company.createdAt,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-outline-variant/40">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsSection
            title={company.name}
            description={company.id}
            icon={Building2}
            compact
          >
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-on-surface-variant">{t("owner")}</dt>
                <dd className="font-medium">{company.ownerEmail ?? company.ownerId}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("colPlan")}</dt>
                <dd>{getPlanDisplayName(planId, locale)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("market")}</dt>
                <dd>{company.billingMarket ?? "—"}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <SubscriptionStatusBadge status={company.subscription?.status ?? "none"} />
                <PlatformStatusBadge status={company.platformControl?.status ?? "active"} />
              </div>
              {company.platformControl?.reason && (
                <div>
                  <dt className="text-on-surface-variant">{t("actions.reasonLabel")}</dt>
                  <dd>{company.platformControl.reason}</dd>
                </div>
              )}
            </dl>
          </SettingsSection>

          <SettingsSection title={t("tabs.clients")} icon={Users} compact>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-on-surface-variant">{t("colClients")}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{company.clientCount}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("stats.queueNow")}</dt>
                <dd className="tabular-nums">{company.queueWaiting}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("tabs.team")}</dt>
                <dd className="tabular-nums">
                  {company.memberCount} {t("members")}
                </dd>
              </div>
            </dl>
          </SettingsSection>
        </div>
      )}

      {tab === "subscription" && (
        <div className="space-y-4">
          <SettingsSection title={t("tabs.subscription")} icon={CreditCard} compact>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-on-surface-variant">{t("colPlan")}</dt>
                <dd className="font-medium">{getPlanDisplayName(planId, locale)}</dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("colSubscription")}</dt>
                <dd className="mt-1">
                  <SubscriptionStatusBadge status={company.subscription?.status ?? "none"} />
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("stripeCustomer")}</dt>
                <dd className="break-all font-mono text-xs">
                  {company.subscription?.stripeCustomerId ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("stripeSubscription")}</dt>
                <dd className="break-all font-mono text-xs">
                  {company.subscription?.stripeSubscriptionId ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("periodEnd")}</dt>
                <dd>
                  {formatDisplayDate(company.subscription?.currentPeriodEnd, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-on-surface-variant">{t("usageThisMonth")}</dt>
                <dd className="tabular-nums">
                  {company.billingUsage?.completedCount ?? 0}
                  {company.billingUsage?.monthKey
                    ? ` (${company.billingUsage.monthKey})`
                    : ""}
                </dd>
              </div>
              <div>
                <Link
                  href={`/platform/finance?companyId=${encodeURIComponent(company.id)}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("finance.viewTransactions")}
                </Link>
              </div>
            </dl>
          </SettingsSection>

          <PlatformPlanChangeForm
            company={company}
            onUpdated={onSubscriptionUpdated}
          />
        </div>
      )}

      {tab === "team" && (
        <div className={cn(surfaceCard, "overflow-hidden")}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low/60 text-xs uppercase text-on-surface-variant">
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">UID</th>
              </tr>
            </thead>
            <tbody>
              {company.members.map((member) => (
                <tr key={member.userId} className="border-b border-outline-variant/20">
                  <td className="px-4 py-3">{member.email}</td>
                  <td className="px-4 py-3">{getRoleLabel(member.role)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">
                    {member.userId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "clients" && (
        <SettingsSection title={t("tabs.clients")} icon={Users} compact>
          <p className="text-sm text-on-surface-variant">
            {company.clientCount.toLocaleString()} {t("colClients").toLowerCase()} registrados nesta
            empresa.
          </p>
        </SettingsSection>
      )}
    </div>
  );
}
