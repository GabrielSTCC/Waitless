"use client";

import { KeyRound, Mail, Shield } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { getLoginProviderIds, userHasPasswordProvider } from "@/lib/firebase/auth";
import { AdminShell } from "@/components/layout/AdminShell";
import { PasswordForm } from "@/components/security/PasswordForm";
import { TwoFactorSettings } from "@/components/security/TwoFactorSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { useTranslations } from "@/components/providers/LocaleProvider";

function providerLabel(providerId: string, t: (key: string) => string): string {
  if (providerId === "google.com") return t("providerGoogle");
  if (providerId === "password") return t("providerPassword");
  return providerId;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const { t } = useTranslations("security");
  const { t: tc } = useTranslations("common");
  const infoLabel = tc("infoMore");

  const providers = user ? getLoginProviderIds(user) : [];
  const hasPassword = user ? userHasPasswordProvider(user) : false;
  const hasGoogle = providers.includes("google.com");

  return (
    <AdminShell>
      <main
        id="main-content"
        className="relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-background px-4 pb-8 pt-14 md:px-6 md:py-6 md:pb-10 md:pt-6 lg:px-8"
      >
        <div className="flex w-full flex-col gap-5">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-6 w-6 text-primary" strokeWidth={2} />
              <h1 className="text-xl font-semibold tracking-tight text-on-surface md:text-2xl">
                {t("title")}
              </h1>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SettingsSection
              title={t("accountInfoTitle")}
              description={t("accountInfoDescription")}
              info={t("info.accountSection")}
              infoLabel={infoLabel}
              icon={Mail}
              compact
              className="h-full"
            >
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                    {t("emailLabel")}
                  </p>
                  <p className="mt-0.5 font-medium text-on-surface">
                    {user?.email ?? t("noEmail")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                    {t("loginMethodsLabel")}
                  </p>
                  <ul className="mt-1 space-y-1 text-on-surface-variant">
                    {providers.map((providerId) => (
                      <li key={providerId}>{providerLabel(providerId, t)}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              title={hasPassword ? t("passwordTitle") : t("addPasswordTitle")}
              description={
                hasPassword
                  ? t("passwordDescription")
                  : hasGoogle
                    ? t("addPasswordDescriptionGoogle")
                    : t("addPasswordDescription")
              }
              info={hasPassword ? t("info.password") : t("info.addPassword")}
              infoLabel={infoLabel}
              icon={KeyRound}
              compact
              className="h-full"
            >
              <PasswordForm />
            </SettingsSection>

            <SettingsSection
              title={t("twoFactorSectionTitle")}
              description={t("twoFactorSectionDescription")}
              info={t("info.twoFactor")}
              infoLabel={infoLabel}
              icon={Shield}
              compact
              className="h-full lg:col-span-2"
            >
              <TwoFactorSettings />
            </SettingsSection>
          </div>
        </div>
      </main>
    </AdminShell>
  );
}
