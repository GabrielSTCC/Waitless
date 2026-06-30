"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { glassChip } from "@/lib/utils/brand-surface";

interface ToleranceCountdownProps {
  expiresAt: Date;
  accentColor?: string;
  locale?: Locale;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ToleranceCountdown({
  expiresAt,
  accentColor,
  locale = "pt-BR",
}: ToleranceCountdownProps) {
  const t = useClientTranslations(locale);
  const [remainingMs, setRemainingMs] = useState(
    () => expiresAt.getTime() - Date.now(),
  );

  useEffect(() => {
    const tick = () => setRemainingMs(expiresAt.getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  if (remainingMs <= 0) return null;

  return (
    <div
      className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5"
      style={glassChip(accentColor)}
    >
      <Timer className="h-4 w-4 text-white" strokeWidth={2.25} />
      <span className="text-sm font-semibold tabular-nums text-white">
        {t("client.toleranceCountdown", { time: formatRemaining(remainingMs) })}
      </span>
    </div>
  );
}
