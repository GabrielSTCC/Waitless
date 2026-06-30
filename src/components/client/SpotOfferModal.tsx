"use client";

import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";

interface SpotOfferModalProps {
  token: string;
  companyName: string;
  accentColor?: string;
  locale?: Locale;
}

export function SpotOfferModal({
  token,
  companyName,
  accentColor,
  locale = "pt-BR",
}: SpotOfferModalProps) {
  const t = useClientTranslations(locale);
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function respond(response: "accept" | "decline") {
    setLoading(response);
    setError("");
    try {
      const res = await fetch("/api/queue/spot-offer/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("client.spotOffer.error"));
      }
    } catch {
      setError(t("client.spotOffer.error"));
    } finally {
      setLoading(null);
    }
  }

  const accent = accentColor ?? "var(--color-primary)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spot-offer-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-surface-container shadow-xl">
        <div className="p-6" style={{ borderTop: `3px solid ${accent}` }}>
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <BellRing className="h-5 w-5 text-primary" strokeWidth={2} />
          </div>
          <h2 id="spot-offer-title" className="font-heading text-xl font-bold text-on-surface">
            {t("client.spotOffer.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {t("client.spotOffer.body", { company: companyName })}
          </p>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => respond("accept")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-opacity disabled:opacity-60"
            >
              {loading === "accept" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("client.spotOffer.accept")}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => respond("decline")}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
            >
              {loading === "decline" && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("client.spotOffer.decline")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
