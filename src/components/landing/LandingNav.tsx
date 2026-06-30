"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { LanguageSwitcher } from "@/components/accessibility/LanguageSwitcher";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { cn } from "@/lib/utils/cn";
import { landingContainer } from "@/components/landing/landing-layout";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function useScrolled(threshold = 12) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const onScroll = () => onStoreChange();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    },
    () => window.scrollY > threshold,
    () => false,
  );
}

interface LandingNavProps {
  showLogo?: boolean;
  className?: string;
}

export function LandingNav({ showLogo = false, className }: LandingNavProps) {
  const { t } = useTranslations("landing");
  const pathname = usePathname();
  const isPlansPage = pathname === "/planos";
  const mounted = useMounted();
  const scrolled = useScrolled();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = mounted && (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 overflow-visible border-b pt-[env(safe-area-inset-top,0px)] transition-all duration-300",
        scrolled
          ? cn(
              "backdrop-blur-md",
              showLogo
                ? "border-primary/20 bg-background/95 shadow-[0_4px_24px_-4px_rgb(10_27_63/0.08)] dark:shadow-[0_4px_24px_-4px_rgb(0_0_0/0.35)]"
                : "border-outline-variant/30 bg-background/70 dark:bg-background/80",
            )
          : "border-transparent bg-transparent shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          landingContainer,
          "flex items-center gap-4 py-2.5 md:py-3",
          showLogo ? "justify-between" : "justify-end",
        )}
      >
        <Link
          href="/"
          aria-label="Waitless"
          className={cn(
            "flex shrink-0 items-center overflow-hidden transition-all duration-300 ease-out",
            showLogo
              ? "max-h-16 max-w-[150px] opacity-100 sm:max-w-[170px]"
              : "pointer-events-none max-h-0 max-w-0 opacity-0",
          )}
        >
          <Logo
            variant="compact"
            className="mx-0 h-auto max-h-14 w-auto max-w-[150px] object-contain object-left sm:max-h-[3.75rem] sm:max-w-[170px]"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Landing navigation">
          <LanguageSwitcher />

          {mounted && (
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant shadow-surface-input transition-colors hover:bg-surface-container-high hover:text-on-surface"
              aria-label={isDark ? t("themeLight") : t("themeDark")}
            >
              {isDark ? (
                <Moon className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Sun className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          )}

          <Link
            href="/planos"
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isPlansPage
                ? "text-on-surface"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {t("navPlans")}
          </Link>

          <Link
            href="/admin/auth"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:text-on-surface sm:inline-flex"
          >
            {t("navLogin")}
          </Link>

          <Link
            href="/admin/auth?mode=signup"
            className="inline-flex items-center rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-on-primary shadow-surface-raised transition-[filter] hover:brightness-95 sm:px-4"
          >
            {t("navSignup")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
