"use client";

import Link from "next/link";
import { CookiePreferencesTrigger } from "@/components/legal/CookieConsentBanner";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { getLegalConfig } from "@/lib/legal/config";
import { cn } from "@/lib/utils/cn";

interface LegalFooterStripProps {
  className?: string;
  /** Exibe e-mail do DPO abaixo dos links */
  showDpo?: boolean;
  /** Atalho para login do painel da plataforma */
  showAdminLink?: boolean;
  /** `admin` — barra compacta alinhada à coluna principal do painel */
  variant?: "default" | "admin";
}

export function LegalFooterStrip({
  className,
  showDpo = false,
  showAdminLink = false,
  variant = "default",
}: LegalFooterStripProps) {
  const { t } = useTranslations("legal");
  const legal = getLegalConfig();
  const isAdmin = variant === "admin";

  const links = [
    { href: "/privacidade", label: t("footerPrivacy") },
    { href: "/termos", label: t("footerTerms") },
    { href: "/cookies", label: t("footerCookies") },
    { href: "/canal-lgpd", label: t("footerLgpd") },
    { href: "/contato", label: t("footerContact") },
  ] as const;

  const linkClass = isAdmin
    ? "text-on-surface-variant/75 underline-offset-2 hover:text-on-surface hover:underline"
    : "text-on-surface-variant underline-offset-2 hover:text-on-surface hover:underline";

  return (
    <footer
      className={cn(
        isAdmin
          ? "shrink-0 border-t border-outline-variant/20 px-4 py-2.5 md:px-8"
          : "border-t border-outline-variant/40 px-4 py-4 text-center",
        className,
      )}
    >
      <nav
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
          isAdmin ? "justify-start" : "justify-center",
        )}
        aria-label={t("footerNavLabel")}
      >
        {links.map(({ href, label }) => (
          <Link key={href} href={href} className={linkClass}>
            {label}
          </Link>
        ))}
        <CookiePreferencesTrigger className={linkClass}>
          {t("footerCookiePrefs")}
        </CookiePreferencesTrigger>
        {showAdminLink && (
          <Link href="/platform/auth" className={linkClass}>
            {t("footerAdmin")}
          </Link>
        )}
      </nav>
      {showDpo && (
        <p className="mt-2 text-[11px] text-on-surface-variant">
          {t("footerDpoLabel")} {legal.dpoName} —{" "}
          <a href={`mailto:${legal.lgpdEmail}`} className="hover:underline">
            {legal.lgpdEmail}
          </a>
        </p>
      )}
    </footer>
  );
}
