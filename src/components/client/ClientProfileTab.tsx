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
}: Readonly<ClientProfileTabProps>) {
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
      <div className="mx-4 space-y-3 py-4 md:mx-6 md:max-w-xl">
        <div className="h-4 w-1/3 animate-pulse rounded bg-surface-container-high" />
        <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
        <div className="h-10 animate-pulse rounded-xl bg-surface-container-high" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <p className="mx-4 py-8 text-center text-sm text-error md:mx-6">
        {error || t("client.profile.loadError")}
      </p>
    );
  }

  return (
    <div className="mx-4 space-y-6 md:mx-6 md:max-w-xl">
      <div>
        <h2 className="font-heading text-lg font-semibold text-on-surface md:text-xl">
          {t("client.profile.title")}
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">{profile.companyName}</p>
      </div>

      <dl className="space-y-4 border-y border-outline-variant/70 py-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("client.profile.nameLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-on-surface">{profile.clientName}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
            {t("client.profile.whatsappLabel")}
          </dt>
          <dd className="mt-1 text-sm font-medium tabular-nums text-on-surface">
            {profile.maskedWhatsapp}
          </dd>
        </div>
      </dl>

      <div>
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
