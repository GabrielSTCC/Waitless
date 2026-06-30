"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { surfaceDropdown } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface InfoTipProps {
  content: ReactNode;
  label?: string;
  className?: string;
}

export function InfoTip({
  content,
  label = "Mais informações",
  className,
}: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const reducedMotion = useReducedMotion();

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

  return (
    <div ref={rootRef} className={cn("relative inline-flex shrink-0", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex h-5 w-5 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
      >
        <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} />
      </button>

      {open && (
        <div
          id={popupId}
          role="tooltip"
          className={cn(
            "absolute left-1/2 top-full z-50 mt-1.5 w-[min(280px,calc(100vw-2rem))] -translate-x-1/2 p-3 text-xs leading-relaxed text-on-surface-variant",
            surfaceDropdown,
            !reducedMotion && "transition-opacity duration-150",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
