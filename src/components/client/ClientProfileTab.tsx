"use client";

import { useEffect, useState } from "react";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import { LOCALES, type Locale } from "@/lib/i18n/types";

interface ClientProfileData {
  clientName: string;
  maskedWhatsapp: string;
  companyName: string;
  locale: Locale;
}

interface ClientProfileTabProps {
  token: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  accentColor?: string;
}

export function ClientProfileTab({
  token,
  locale,
  onLocaleChange,
}: ClientProfileTabProps) {
  const t = useClientTranslations(locale);
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/queue/client-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as ClientProfileData & { error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? t("client.profile.loadError"));
          return;
        }
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setError(t("client.profile.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  if (loading) {
    return (
      <div className="mx-4 space-y-3 py-4">
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-container-high" />
        <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
        <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p className="mx-4 py-8 text-center text-sm text-error">
        {error || t("client.profile.loadError")}
      </p>
    );
  }

  return (
    <div className="mx-4 space-y-5 rounded-2xl border border-outline-variant bg-surface-container p-4">
      <h2 className="font-heading text-base font-semibold text-on-surface">
        {t("client.profile.title")}
      </h2>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("client.profile.nameLabel")}
          </p>
          <p className="mt-0.5 text-sm font-medium text-on-surface">{profile.clientName}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("client.profile.whatsappLabel")}
          </p>
          <p className="mt-0.5 text-sm font-medium tabular-nums text-on-surface">
            {profile.maskedWhatsapp}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("client.profile.companyLabel")}
          </p>
          <p className="mt-0.5 text-sm font-medium text-on-surface">{profile.companyName}</p>
        </div>
      </div>

      <div className="border-t border-outline-variant pt-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
          {t("client.profile.languageLabel")}
        </p>
        <SegmentControl
          aria-label={t("client.profile.languageLabel")}
          value={locale}
          onChange={onLocaleChange}
          options={LOCALES.map((loc) => ({
            value: loc,
            label: loc === "pt-BR" ? "PT" : "EN",
          }))}
        />
        <p className="mt-2 text-xs text-on-surface-variant">{t("client.profile.languageHint")}</p>
      </div>
    </div>
  );
}
