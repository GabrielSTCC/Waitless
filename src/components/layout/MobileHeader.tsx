"use client";

import { Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/accessibility/LanguageSwitcher";
import { useTranslations } from "@/components/providers/LocaleProvider";

interface MobileHeaderProps {
  menuOpen?: boolean;
  onMenuClick: () => void;
  onMenuClose?: () => void;
}

export function MobileHeader({ menuOpen = false, onMenuClick, onMenuClose }: MobileHeaderProps) {
  const { t } = useTranslations("sidebar");

  return (
    <header className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-outline-variant bg-surface-container px-4 md:hidden">
      <h1 className="text-lg font-semibold tracking-tight text-primary">Waitless</h1>
      <div className="flex items-center gap-2">
        <LanguageSwitcher variant="compact" />
        <button
          type="button"
          aria-label={menuOpen ? t("closeMenu") : "Menu"}
          aria-expanded={menuOpen}
          onClick={menuOpen ? onMenuClose : onMenuClick}
          className="rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high active:scale-95"
        >
          {menuOpen ? (
            <X className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2} />
          )}
        </button>
      </div>
    </header>
  );
}
