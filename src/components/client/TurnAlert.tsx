import { BellRing, MapPin } from "lucide-react";
import { useClientTranslations } from "@/components/providers/LocaleProvider";
import type { Locale } from "@/lib/types";
import { glassChip } from "@/lib/utils/brand-surface";

interface TurnAlertProps {
  position: number;
  accentColor?: string;
  toleranceEnabled?: boolean;
  toleranceMin?: number;
  locale?: Locale;
}

export function TurnAlert({
  position,
  accentColor,
  toleranceEnabled,
  toleranceMin,
  locale = "pt-BR",
}: TurnAlertProps) {
  const t = useClientTranslations(locale);

  let alert: { title: string; body: string; urgent: boolean } | null = null;

  if (position === 1) {
    const toleranceNote =
      toleranceEnabled && toleranceMin
        ? t("client.turnNextTolerance", { min: toleranceMin })
        : t("client.turnNextBody");
    alert = {
      title: t("client.turnNextTitle"),
      body: toleranceNote,
      urgent: true,
    };
  } else if (position === 2) {
    alert = {
      title: t("client.turnSoonTitle"),
      body: t("client.turnSoonBody"),
      urgent: true,
    };
  } else if (position === 3) {
    alert = {
      title: t("client.turnAlmostTitle"),
      body: t("client.turnAlmostBody"),
      urgent: false,
    };
  }

  if (!alert) return null;

  const accent = accentColor ?? "var(--color-primary)";

  return (
    <div
      className="mx-4 mt-6 overflow-hidden rounded-2xl border border-white/10"
      style={glassChip(accent)}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            alert.urgent ? "bg-white/20" : "bg-white/10"
          }`}
        >
          {alert.urgent ? (
            <BellRing className="h-4 w-4 text-white" strokeWidth={2.25} />
          ) : (
            <MapPin className="h-4 w-4 text-white" strokeWidth={2.25} />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{alert.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-white/85">{alert.body}</p>
        </div>
      </div>
    </div>
  );
}
