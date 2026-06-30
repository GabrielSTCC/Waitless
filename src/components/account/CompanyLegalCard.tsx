"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { updateCompany } from "@/lib/firebase/firestore";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsButton } from "@/components/settings/SettingsButton";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { SettingsField, settingsInputClass } from "@/components/settings/SettingsField";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { formatCnpj, normalizeCnpj, validateCnpj } from "@/lib/utils/cnpj";
import type { Company } from "@/lib/types";

interface CompanyLegalCardProps {
  company: Company;
}

export function CompanyLegalCard({ company }: CompanyLegalCardProps) {
  const { refreshSession } = useAuth();
  const { t } = useTranslations("account");
  const { t: tc } = useTranslations("common");
  const infoLabel = tc("infoMore");

  const [cnpj, setCnpj] = useState("");
  const [legalName, setLegalName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setCnpj(company.legal?.cnpj ? formatCnpj(company.legal.cnpj) : "");
    setLegalName(company.legal?.legalName ?? "");
  }, [company.legal?.cnpj, company.legal?.legalName]);

  const baselineCnpj = company.legal?.cnpj ?? "";
  const baselineLegalName = company.legal?.legalName ?? "";
  const hasChanges =
    normalizeCnpj(cnpj) !== baselineCnpj ||
    legalName.trim() !== baselineLegalName;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const normalizedCnpj = normalizeCnpj(cnpj);
    const trimmedLegalName = legalName.trim();

    if (normalizedCnpj) {
      const cnpjError = validateCnpj(normalizedCnpj);
      if (cnpjError) {
        setError(t("cnpjInvalid"));
        return;
      }
    }

    if (!normalizedCnpj && !trimmedLegalName) {
      setError(t("legalRequiredOne"));
      return;
    }

    setSaving(true);
    try {
      await updateCompany(company.id, {
        legal: {
          cnpj: normalizedCnpj || undefined,
          legalName: trimmedLegalName || undefined,
        },
      });
      await refreshSession();
      setSuccess(t("legalSaved"));
    } catch {
      setError(tc("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsSection
      title={t("legalTitle")}
      description={t("legalDescription")}
      info={t("info.legalSection")}
      infoLabel={infoLabel}
      icon={Building2}
      compact
      className="h-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <SettingsFeedback error={error} success={success} />

        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField
            label={t("cnpjLabel")}
            info={t("info.cnpj")}
            infoLabel={infoLabel}
          >
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={cnpj}
              onChange={(e) => setCnpj(formatCnpj(e.target.value))}
              placeholder="00.000.000/0000-00"
              className={settingsInputClass}
            />
          </SettingsField>

          <SettingsField
            label={t("legalNameLabel")}
            info={t("info.legalName")}
            infoLabel={infoLabel}
          >
            <input
              type="text"
              autoComplete="organization"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder={t("legalNamePlaceholder")}
              className={settingsInputClass}
            />
          </SettingsField>
        </div>

        <p className="text-xs text-on-surface-variant">{t("legalPrivacyNote")}</p>

        <SettingsButton
          type="submit"
          variant="primary"
          size="md"
          loading={saving}
          disabled={!hasChanges}
          className="self-start"
        >
          {t("legalSave")}
        </SettingsButton>
      </form>
    </SettingsSection>
  );
}
