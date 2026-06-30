"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Accessibility, ExternalLink, Languages } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { updateCompany } from "@/lib/firebase/firestore";
import { AdminShell } from "@/components/layout/AdminShell";
import { LanguageSwitcher } from "@/components/accessibility/LanguageSwitcher";
import { MotionPreferenceCards } from "@/components/accessibility/MotionPreferenceCards";
import { TextScaleSelector } from "@/components/accessibility/TextScaleSelector";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsLabel } from "@/components/settings/SettingsLabel";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { ThemeToggleCards } from "@/components/settings/ThemeToggleCards";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { surfacePanel } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export default function AccessibilityPage() {
  const { user, company } = useAuth();
  const { t } = useTranslations("accessibility");
  const { t: tc } = useTranslations("common");
  const infoLabel = tc("infoMore");
  const { setLocale } = useLocale();
  const isOwner = !!user && !!company && user.uid === company.ownerId;

  const [companyLocale, setCompanyLocale] = useState<Locale>("pt-BR");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (company?.defaultLocale) {
      setCompanyLocale(company.defaultLocale);
    }
  }, [company?.defaultLocale]);

  async function handleSaveCompanyLocale() {
    if (!company || !isOwner) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateCompany(company.id, { defaultLocale: companyLocale });
      setLocale(companyLocale);
      setSuccess(t("companyLanguageSaved"));
    } catch {
      setError(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell>
      <main
        id="main-content"
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background px-4 pb-8 pt-14 md:px-6 md:py-6 md:pb-10 md:pt-6 lg:px-8"
      >
        <div className="flex w-full flex-col gap-5">
          <div>
            <div className="flex items-center gap-2">
              <Accessibility className="h-6 w-6 text-primary" strokeWidth={2} />
              <h1 className="text-xl font-semibold tracking-tight text-on-surface md:text-2xl">
                {t("title")}
              </h1>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>
          </div>

          <SettingsFeedback error={error} success={success} />

          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsSection
              title={t("sessionLanguage")}
              description={t("sessionLanguageHelper")}
              info={t("info.sessionLanguage")}
              infoLabel={infoLabel}
              icon={Languages}
              compact
              className="h-full"
            >
              <LanguageSwitcher variant="cards" />
            </SettingsSection>

            {isOwner ? (
              <SettingsSection
                title={t("companyLanguage")}
                description={t("companyLanguageHelper")}
                info={t("info.companyLanguage")}
                infoLabel={infoLabel}
                icon={Languages}
                compact
                className="h-full"
              >
                <SegmentControl
                  aria-label={t("companyLanguage")}
                  value={companyLocale}
                  onChange={setCompanyLocale}
                  options={LOCALES.map((loc) => ({
                    value: loc,
                    label: loc === "pt-BR" ? "Português" : "English",
                  }))}
                />
                <SettingsButton
                  type="button"
                  onClick={handleSaveCompanyLocale}
                  loading={saving}
                  disabled={companyLocale === company.defaultLocale}
                >
                  {t("saveCompanyLanguage")}
                </SettingsButton>
              </SettingsSection>
            ) : (
              <p className={cn("flex h-full items-center px-4 py-3 text-sm text-on-surface-variant", surfacePanel)}>
                {t("ownerOnly")}
              </p>
            )}
          </div>

          <SettingsSection title={t("visualPrefs")} icon={Accessibility} compact>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <SettingsLabel info={t("info.theme")} infoLabel={infoLabel} className="mb-2">
                  {t("theme")}
                </SettingsLabel>
                <ThemeToggleCards compact />
              </div>
              <div>
                <SettingsLabel info={t("info.textScale")} infoLabel={infoLabel} className="mb-2">
                  {t("textScale")}
                </SettingsLabel>
                <TextScaleSelector />
              </div>
              <div className="md:col-span-2 xl:col-span-1">
                <SettingsLabel info={t("info.motion")} infoLabel={infoLabel} className="mb-2">
                  {t("motion")}
                </SettingsLabel>
                <MotionPreferenceCards />
              </div>
            </div>
          </SettingsSection>

          <div className={cn(surfacePanel, "p-4 md:p-5")}>
            <p className="text-sm text-on-surface-variant">{t("contrastInfo")}</p>
            <Link
              href="/admin/settings"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t("contrastLink")}
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
