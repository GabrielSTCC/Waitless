"use client";

import type { LucideIcon } from "lucide-react";
import {
  surfaceSegmentOption,
  surfaceSegmentOptionActive,
  surfaceSegmentOptionInactive,
  surfaceSegmentTrack,
} from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
  size?: "sm" | "md";
  className?: string;
}

const sizeClasses = {
  sm: "px-2 py-2.5 text-xs sm:text-sm",
  md: "gap-2 px-3 py-2.5 text-sm",
} as const;

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel,
  size = "md",
  className,
}: SegmentControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn(surfaceSegmentTrack, className)}>
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const active = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(optionValue)}
            className={cn(
              surfaceSegmentOption,
              sizeClasses[size],
              Icon && "gap-2",
              active ? surfaceSegmentOptionActive : surfaceSegmentOptionInactive,
            )}
          >
            {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.25 : 2} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
