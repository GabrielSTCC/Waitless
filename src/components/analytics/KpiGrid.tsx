import {
  Clock,
  Hourglass,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import type { AnalyticsKpis } from "@/lib/analytics/compute";
import { cn } from "@/lib/utils/cn";

interface KpiGridProps {
  kpis: AnalyticsKpis;
}

const cards = [
  {
    key: "servedToday" as const,
    label: "Atendimentos hoje",
    icon: UserCheck,
    suffix: undefined,
    iconWrap: "bg-primary/15 text-primary",
    value: "text-primary",
    bar: "from-primary via-surface-tint to-primary/40",
    surface: "from-primary/[0.12] via-surface-container to-surface-container",
    border: "border-primary/20",
  },
  {
    key: "waitingNow" as const,
    label: "Na fila agora",
    icon: Hourglass,
    suffix: undefined,
    iconWrap: "bg-amber-500/15 text-amber-600",
    value: "text-amber-700",
    bar: "from-amber-400 via-amber-500 to-amber-600/60",
    surface: "from-amber-500/[0.1] via-surface-container to-surface-container",
    border: "border-amber-500/25",
  },
  {
    key: "inServiceNow" as const,
    label: "Em atendimento",
    icon: Zap,
    suffix: undefined,
    iconWrap: "bg-sky-500/15 text-sky-600",
    value: "text-sky-700",
    bar: "from-sky-400 via-sky-500 to-brand-navy/40",
    surface: "from-sky-500/[0.1] via-surface-container to-surface-container",
    border: "border-sky-500/25",
  },
  {
    key: "avgWaitMinToday" as const,
    label: "Espera média",
    icon: Clock,
    suffix: " min",
    iconWrap: "bg-violet-500/15 text-violet-600",
    value: "text-violet-700",
    bar: "from-violet-400 via-violet-500 to-brand-navy/30",
    surface: "from-violet-500/[0.08] via-surface-container to-surface-container",
    border: "border-violet-500/20",
  },
  {
    key: "avgServiceMinToday" as const,
    label: "Atendimento médio",
    icon: TrendingUp,
    suffix: " min",
    iconWrap: "bg-brand-navy/10 text-brand-navy",
    value: "text-brand-navy",
    bar: "from-brand-navy via-secondary to-brand-navy/50",
    surface: "from-brand-navy/[0.06] via-surface-container to-surface-container",
    border: "border-brand-navy/15",
  },
  {
    key: "totalClients" as const,
    label: "Clientes cadastrados",
    icon: Users,
    suffix: undefined,
    iconWrap: "bg-emerald-500/15 text-emerald-600",
    value: "text-emerald-700",
    bar: "from-emerald-400 via-emerald-500 to-brand-navy/30",
    surface: "from-emerald-500/[0.08] via-surface-container to-surface-container",
    border: "border-emerald-500/20",
  },
];

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {cards.map(({ key, label, icon: Icon, suffix, iconWrap, value, bar, surface, border }) => (
        <div
          key={key}
          className={cn(
            "group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 shadow-surface-card transition-shadow hover:shadow-surface-card-hover",
            surface,
            border,
          )}
        >
          <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", bar)} />
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                iconWrap,
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.25} />
            </div>
          </div>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-on-surface-variant">
            {label}
          </p>
          <p className={cn("mt-1 font-heading text-2xl font-bold tabular-nums", value)}>
            {kpis[key]}
            {suffix ?? ""}
          </p>
        </div>
      ))}
    </div>
  );
}
