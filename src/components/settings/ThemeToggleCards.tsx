"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { SegmentControl } from "@/components/ui/SegmentControl";
import { surfaceCard, surfaceCardInteractive } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

interface ThemeToggleCardsProps {
  compact?: boolean;
}

export function ThemeToggleCards({ compact = false }: ThemeToggleCardsProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslations("accessibility");

  if (!mounted) {
    if (compact) {
      return (
        <div className={cn(surfaceCard, "flex h-10 p-1 shadow-surface-inset")}>
          <div className="h-full flex-1 rounded-lg bg-surface-container shadow-surface-raised" />
          <div className="h-full flex-1 rounded-lg" />
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className={cn(surfaceCard, "h-20")} />
        <div className={cn(surfaceCard, "h-20")} />
      </div>
    );
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  const options = [
    { value: "light" as const, label: t("themeLight"), icon: Sun },
    { value: "dark" as const, label: t("themeDark"), icon: Moon },
  ];

  if (compact) {
    return (
      <SegmentControl
        aria-label={t("theme")}
        value={isDark ? "dark" : "light"}
        onChange={(id) => setTheme(id)}
        options={options}
      />
    );
  }

  return (
    <div role="radiogroup" aria-label={t("theme")} className="grid grid-cols-2 gap-3">
      {options.map(({ value: id, label, icon: Icon }) => {
        const active = (id === "dark") === isDark;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(id)}
            className={cn(
              "flex flex-col items-center gap-2 px-4 py-4 transition-all",
              active
                ? cn(surfaceCard, "border-primary/30 shadow-surface-raised ring-1 ring-primary/20")
                : cn(surfaceCardInteractive, "hover:border-outline"),
            )}
          >
            <Icon
              className={cn("h-5 w-5", active ? "text-primary" : "text-on-surface-variant")}
              strokeWidth={active ? 2.25 : 2}
            />
            <span
              className={cn(
                "text-sm font-medium",
                active ? "text-on-surface" : "text-on-surface-variant",
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
