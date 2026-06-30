"use client";

import Link from "next/link";
import {
  KEYWORD_GROUPS,
  KEYWORD_LINKS,
  getKeywordLinksForGroup,
  type KeywordGroup,
} from "@/lib/marketing/solutions";
import { useTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils/cn";

interface SolutionKeywordLinksProps {
  group?: KeywordGroup | "all";
  variant?: "inline" | "grid" | "footer";
  pageLocale: Locale;
  className?: string;
}

function getHref(link: (typeof KEYWORD_LINKS)[number], pageLocale: Locale) {
  return pageLocale === "en" ? link.hrefEn : link.hrefPt;
}

export function SolutionKeywordLinks({
  group = "all",
  variant = "inline",
  pageLocale,
  className,
}: SolutionKeywordLinksProps) {
  const { t } = useTranslations("solutionsHub");

  const links =
    group === "all"
      ? KEYWORD_LINKS
      : getKeywordLinksForGroup(group);

  if (variant === "grid") {
    return (
      <div className={cn("space-y-10", className)}>
        {KEYWORD_GROUPS.map((groupKey) => {
          const groupLinks = getKeywordLinksForGroup(groupKey);
          if (groupLinks.length === 0) return null;

          const groupLabelKey =
            groupKey === "clinica"
              ? "groupClinica"
              : groupKey === "salao"
                ? "groupSalao"
                : groupKey === "restaurante"
                  ? "groupRestaurante"
                  : "groupGeral";

          return (
            <section key={groupKey} aria-labelledby={`keyword-group-${groupKey}`}>
              <h2
                id={`keyword-group-${groupKey}`}
                className="font-heading text-lg font-semibold text-on-surface sm:text-xl"
              >
                {t(groupLabelKey)}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {groupLinks.map((link) => (
                  <li key={link.labelKey}>
                    <Link
                      href={getHref(link, pageLocale)}
                      className="inline-flex rounded-full border border-primary/25 bg-surface-container/80 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:border-primary/40 hover:bg-primary-container/30"
                    >
                      {t(`links.${link.labelKey}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  if (variant === "footer") {
    return (
      <nav className={cn("flex flex-wrap gap-x-4 gap-y-1", className)} aria-label="Solution keywords">
        {links.slice(0, 8).map((link) => (
          <Link
            key={link.labelKey}
            href={getHref(link, pageLocale)}
            className="text-on-surface-variant transition-colors hover:text-on-surface"
          >
            {t(`links.${link.labelKey}`)}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {links.map((link) => (
        <Link
          key={link.labelKey}
          href={getHref(link, pageLocale)}
          className="inline-flex rounded-full border border-outline-variant/60 bg-surface-container/60 px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:border-primary/30 hover:text-on-surface"
        >
          {t(`links.${link.labelKey}`)}
        </Link>
      ))}
    </div>
  );
}
