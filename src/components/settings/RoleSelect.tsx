"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { InviteRole } from "@/lib/permissions";
import { surfaceDropdown, surfaceInput } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const ROLE_OPTIONS: { value: InviteRole; label: string; hint: string }[] = [
  { value: "base", label: "Base", hint: "Fila e clientes" },
  { value: "admin", label: "Admin", hint: "Configurações e analytics" },
];

interface RoleSelectProps {
  value: InviteRole;
  onChange: (value: InviteRole) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  "aria-label"?: string;
}

export function RoleSelect({
  value,
  onChange,
  disabled = false,
  className,
  size = "md",
  "aria-label": ariaLabel,
}: RoleSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = ROLE_OPTIONS.find((option) => option.value === value) ?? ROLE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectOption(option: InviteRole) {
    onChange(option);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-outline-variant bg-surface-container-low text-left text-on-surface",
          surfaceInput,
          "hover:border-outline hover:bg-surface-container",
          "focus:border-primary focus:bg-surface-container focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-primary bg-surface-container shadow-surface-raised ring-2 ring-primary/20",
          size === "sm" ? "h-9 min-w-[7.5rem] px-3 text-xs" : "h-11 min-w-[8.5rem] px-3.5 text-sm",
        )}
      >
        <span className="font-medium">{selected.label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-on-surface-variant transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn("absolute right-0 z-20 mt-1.5 min-w-full overflow-hidden p-1", surfaceDropdown)}
        >
          {ROLE_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option.value)}
                  className={cn(
                    "flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface hover:bg-surface-container-high",
                  )}
                >
                  <span>
                    <span className={cn("block font-medium", size === "sm" ? "text-xs" : "text-sm")}>
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-on-surface-variant">
                      {option.hint}
                    </span>
                  </span>
                  {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.5} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
