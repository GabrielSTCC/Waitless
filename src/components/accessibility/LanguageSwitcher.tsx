"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { getLocalePair } from "@/lib/marketing/solutions";
import { LOCALES, type Locale } from "@/lib/i18n/types";
import { surfaceDropdown } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const LOCALE_LABELS: Record<Locale, string> = {
  "pt-BR": "PT",
  en: "EN",
};

interface LanguageSwitcherProps {
  variant?: "compact" | "cards";
  className?: string;
}

export function LanguageSwitcher({ variant = "compact", className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function changeLocale(next: Locale) {
    const pair = getLocalePair(pathname);
    setLocale(next);
    if (pair) {
      const target = next === "en" ? pair.pathEn : pair.pathPt;
      if (target !== pathname) {
        router.push(target);
      }
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (variant === "cards") {
    return (
      <SegmentControl
        aria-label={t("language")}
        className={className}
        value={locale}
        onChange={changeLocale}
        options={LOCALES.map((loc) => ({
          value: loc,
          label: loc === "pt-BR" ? t("portuguese") : t("english"),
        }))}
      />
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("language")}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant shadow-surface-input transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        <Languages className="h-4 w-4" strokeWidth={2} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={t("language")}
          className={cn("absolute right-0 top-full z-50 mt-1 min-w-[120px] overflow-hidden", surfaceDropdown)}
        >
          {LOCALES.map((loc) => (
            <li key={loc} role="option" aria-selected={locale === loc}>
              <button
                type="button"
                onClick={() => {
                  changeLocale(loc);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-surface-container-high",
                  locale === loc
                    ? "font-medium text-primary"
                    : "text-on-surface-variant",
                )}
              >
                <span className="font-mono text-xs">{LOCALE_LABELS[loc]}</span>
                {loc === "pt-BR" ? t("portuguese") : t("english")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
