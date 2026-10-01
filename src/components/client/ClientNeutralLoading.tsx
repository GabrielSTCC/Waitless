"use client";

import { Loader2 } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { cn } from "@/lib/utils/cn";

/** Loading mínimo para /q — evita flash de skeleton de fila em token inválido. */
export function ClientNeutralLoading({ label = "…" }: Readonly<{ label?: string }>) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-on-surface-variant">
      <Loader2
        className={cn("h-8 w-8 text-primary", !reducedMotion && "animate-spin")}
        aria-hidden
      />
      <p className="sr-only" role="status" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
