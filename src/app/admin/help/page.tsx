"use client";

import { HelpCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/AdminShell";
import { HelpCenterView } from "@/components/help/HelpCenterView";
import { useTranslations } from "@/components/providers/LocaleProvider";

export default function HelpPage() {
  const { t } = useTranslations("help");

  return (
    <AdminShell showAddCustomer={false}>
      <main
        id="main-content"
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background px-4 pb-8 pt-14 md:px-6 md:py-6 md:pb-10 md:pt-6 lg:px-8"
      >
        <div className="flex w-full flex-col gap-5">
          <div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" strokeWidth={2} />
              <h1 className="text-xl font-semibold tracking-tight text-on-surface md:text-2xl">
                {t("title")}
              </h1>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>
          </div>

          <HelpCenterView />
        </div>
      </main>
    </AdminShell>
  );
}
