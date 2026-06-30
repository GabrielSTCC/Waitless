"use client";

import { Search } from "lucide-react";
import { useTranslations } from "@/components/providers/LocaleProvider";
import { surfaceInput } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function SearchBar({ value, onChange, disabled = false }: SearchBarProps) {
  const { t } = useTranslations("queue");

  return (
    <div className="mb-5 w-full">
      <label className="sr-only" htmlFor="client-search">
        {t("searchLabel")}
      </label>
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-2.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 focus-within:shadow-surface-raised",
          surfaceInput,
        )}
      >
        <Search className="h-[18px] w-[18px] shrink-0 text-on-surface-variant" strokeWidth={2} />
        <input
          id="client-search"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
    </div>
  );
}
