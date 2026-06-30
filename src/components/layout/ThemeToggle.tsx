"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { theme, setTheme, resolvedTheme } = useTheme();

  if (!mounted) {
    return (
      <div className="h-10 w-full rounded-lg border border-outline-variant bg-surface-container-low" />
    );
  }

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex w-full items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-surface-container-high"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      <span className="flex items-center gap-2">
        {isDark ? (
          <Moon className="h-4 w-4 text-primary" strokeWidth={2} />
        ) : (
          <Sun className="h-4 w-4 text-primary" strokeWidth={2} />
        )}
        Tema {isDark ? "escuro" : "claro"}
      </span>
      <span className="text-xs text-on-surface-variant">Alternar</span>
    </button>
  );
}
