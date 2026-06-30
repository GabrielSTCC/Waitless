"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import {
  acceptAllConsent,
  createConsent,
  getStoredConsent,
  rejectOptionalConsent,
  storeConsent,
  type CookieCategory,
  type CookieConsentState,
} from "@/lib/legal/cookie-consent";
import { cn } from "@/lib/utils/cn";

const CATEGORIES: CookieCategory[] = [
  "necessary",
  "functional",
  "analytics",
  "marketing",
];

export function CookieConsentBanner() {
  const { t } = useTranslations("cookies");
  const [visible, setVisible] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [draft, setDraft] = useState<CookieConsentState | null>(null);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) setVisible(true);
  }, []);

  const persist = useCallback((consent: CookieConsentState) => {
    storeConsent(consent);
    setVisible(false);
    setCustomizeOpen(false);
    window.dispatchEvent(new CustomEvent("waitless:cookie-consent-updated"));
  }, []);

  function openCustomize() {
    const stored = getStoredConsent();
    setDraft(
      stored ??
        createConsent({
          functional: false,
          analytics: false,
          marketing: false,
        }),
    );
    setCustomizeOpen(true);
  }

  function toggleCategory(category: CookieCategory) {
    if (category === "necessary" || !draft) return;
    setDraft({ ...draft, [category]: !draft[category] });
  }

  if (!visible) return null;

  return (
    <>
      <div
        role="dialog"
        aria-labelledby="cookie-banner-title"
        aria-describedby="cookie-banner-desc"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant/60 bg-surface p-4 shadow-lg md:p-5"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex gap-3">
            <Cookie
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden
            />
            <div className="space-y-1">
              <p id="cookie-banner-title" className="text-sm font-medium text-on-surface">
                {t("bannerTitle")}
              </p>
              <p id="cookie-banner-desc" className="text-xs leading-relaxed text-on-surface-variant">
                {t("bannerDescription")}{" "}
                <Link href="/cookies" className="underline hover:text-on-surface">
                  {t("policyLink")}
                </Link>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:shrink-0">
            <button
              type="button"
              onClick={() => persist(rejectOptionalConsent())}
              className="rounded-lg border border-outline px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              {t("reject")}
            </button>
            <button
              type="button"
              onClick={openCustomize}
              className="rounded-lg border border-outline px-3 py-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              {t("customize")}
            </button>
            <button
              type="button"
              onClick={() => persist(acceptAllConsent())}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-on-primary transition-opacity hover:opacity-90"
            >
              {t("accept")}
            </button>
          </div>
        </div>
      </div>

      {customizeOpen && draft && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 md:items-center"
          role="presentation"
          onClick={() => setCustomizeOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setCustomizeOpen(false)}
        >
          <div
            role="dialog"
            aria-labelledby="cookie-customize-title"
            className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="cookie-customize-title" className="font-heading text-lg font-semibold text-on-surface">
                {t("customizeTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setCustomizeOpen(false)}
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-3">
              {CATEGORIES.map((category) => {
                const locked = category === "necessary";
                const checked = locked ? true : draft[category];
                return (
                  <li
                    key={category}
                    className="flex items-start justify-between gap-3 rounded-xl border border-outline-variant/50 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-on-surface">
                        {t(`categories.${category}.title`)}
                      </p>
                      <p className="mt-0.5 text-xs text-on-surface-variant">
                        {t(`categories.${category}.description`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      disabled={locked}
                      onClick={() => toggleCategory(category)}
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        checked ? "bg-primary" : "bg-outline-variant",
                        locked && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          checked ? "left-[22px]" : "left-0.5",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              onClick={() => persist(draft)}
              className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-on-primary hover:opacity-90"
            >
              {t("savePreferences")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Reopens cookie preferences from footer link */
export function CookiePreferencesTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        localStorage.removeItem("waitless-cookie-consent");
        window.location.reload();
      }}
    >
      {children}
    </button>
  );
}
