"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils/cn";

export type ClientTab = "queue" | "history" | "profile";

const TAB_ORDER: ClientTab[] = ["queue", "history", "profile"];

interface ClientTabBarProps {
  activeTab: ClientTab;
  onTabChange: (tab: ClientTab) => void;
  locale: Locale;
  accentColor?: string;
  className?: string;
}

export function ClientTabBar({
  activeTab,
  onTabChange,
  locale,
  accentColor,
  className,
}: ClientTabBarProps) {
  const t = useClientTranslations(locale);
  const reducedMotion = useReducedMotion();
  const tabRefs = useRef<Partial<Record<ClientTab, HTMLButtonElement | null>>>({});

  const labels: Record<ClientTab, string> = {
    queue: t("client.tabs.queue"),
    history: t("client.tabs.history"),
    profile: t("client.tabs.profile"),
  };

  const handleKeyDown = useCallback(
    (event: KeyboardEvent, tab: ClientTab) => {
      const index = TAB_ORDER.indexOf(tab);
      if (index < 0) return;

      let nextIndex: number | null = null;
      if (event.key === "ArrowRight") {
        nextIndex = (index + 1) % TAB_ORDER.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (index - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = TAB_ORDER.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const nextTab = TAB_ORDER[nextIndex]!;
        onTabChange(nextTab);
        tabRefs.current[nextTab]?.focus();
      }
    },
    [onTabChange],
  );

  return (
    <div
      role="tablist"
      aria-label={t("client.tabs.ariaLabel")}
      className={cn("mx-4 mb-4 flex gap-1 rounded-2xl bg-surface-container p-1", className)}
    >
      {TAB_ORDER.map((tab) => {
        const selected = activeTab === tab;
        return (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[tab] = el;
            }}
            type="button"
            role="tab"
            id={`client-tab-${tab}`}
            aria-selected={selected}
            aria-controls={`client-panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onTabChange(tab)}
            onKeyDown={(e) => handleKeyDown(e, tab)}
            className={cn(
              "flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              !reducedMotion && "transition-all duration-200",
              selected
                ? "bg-surface text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface",
            )}
            style={
              selected && accentColor
                ? { color: accentColor }
                : undefined
            }
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}
