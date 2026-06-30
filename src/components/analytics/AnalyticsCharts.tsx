"use client";

import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Clock3,
  LayoutList,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  AnalyticsDashboard,
  DailyPoint,
  DistributionPoint,
  HourlyPoint,
} from "@/lib/analytics/compute";
import {
  analyticsColors,
  waitDistributionColors,
} from "@/components/analytics/analytics-theme";
import { surfaceCard, surfaceDropdown } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const chartIcons = {
  trend: TrendingUp,
  hourly: BarChart3,
  wait: Clock3,
  summary: LayoutList,
} as const;

function ChartCard({
  title,
  subtitle,
  variant = "trend",
  children,
}: {
  title: string;
  subtitle?: string;
  variant?: keyof typeof chartIcons;
  children: ReactNode;
}) {
  const Icon = chartIcons[variant];
  const accents: Record<keyof typeof chartIcons, string> = {
    trend: "from-primary/20 to-surface-tint/10 text-primary border-primary/20",
    hourly: "from-sky-500/20 to-brand-navy/5 text-sky-600 border-sky-500/20",
    wait: "from-violet-500/15 to-primary/5 text-violet-600 border-violet-500/20",
    summary: "from-brand-navy/10 to-secondary/5 text-brand-navy border-brand-navy/15",
  };

  return (
    <div className={cn("overflow-hidden", surfaceCard)}>
      <div className="flex items-start gap-3 border-b border-outline-variant/50 bg-gradient-to-r from-surface-container-low to-surface-container px-4 py-4 md:px-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-gradient-to-br",
            accents[variant],
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h3 className="font-heading font-semibold text-on-surface">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-on-surface-variant">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-4 md:p-5">
        <div className="h-56 md:h-64">{children}</div>
      </div>
    </div>
  );
}

function DailyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: DailyPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className={cn("px-3 py-2.5 text-xs", surfaceDropdown, "border-primary/20")}>
      <p className="font-semibold text-on-surface">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-primary">
        <Activity className="h-3 w-3" />
        {point.count} atendimentos
      </p>
      <p className="mt-0.5 text-on-surface-variant">
        Espera média: {point.avgWaitMin} min
      </p>
    </div>
  );
}

function SimpleTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className={cn("px-3 py-2 text-xs", surfaceDropdown)}>
      <p className="font-semibold text-on-surface">{label}</p>
      <p className="mt-0.5 font-medium text-primary">
        {payload[0].value}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

export function WeeklyTrendChart({ data }: { data: DailyPoint[] }) {
  return (
    <ChartCard
      title="Atendimentos — últimos 7 dias"
      subtitle="Volume diário e tendência"
      variant="trend"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="fillOrangePremium" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={analyticsColors.orange} stopOpacity={0.45} />
              <stop offset="55%" stopColor={analyticsColors.orangeLight} stopOpacity={0.15} />
              <stop offset="100%" stopColor={analyticsColors.navy} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="strokeOrangePremium" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={analyticsColors.navyMid} />
              <stop offset="50%" stopColor={analyticsColors.orange} />
              <stop offset="100%" stopColor={analyticsColors.orangeLight} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={analyticsColors.orangeSoft} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: analyticsColors.navyLight, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: analyticsColors.navyLight, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<DailyTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="url(#strokeOrangePremium)"
            strokeWidth={2.5}
            fill="url(#fillOrangePremium)"
            dot={{ fill: analyticsColors.orange, strokeWidth: 0, r: 3 }}
            activeDot={{ fill: analyticsColors.orange, stroke: "#fff", strokeWidth: 2, r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function hourlyBarColor(count: number, peak: number): string {
  if (count === 0) return `${analyticsColors.navyLight}40`;
  const ratio = peak > 0 ? count / peak : 0;
  if (ratio >= 1) return analyticsColors.orange;
  if (ratio >= 0.6) return analyticsColors.orangeLight;
  if (ratio >= 0.3) return analyticsColors.active;
  return analyticsColors.navyMid;
}

export function HourlyChart({ data }: { data: HourlyPoint[] }) {
  const businessHours = data.filter((d) => {
    const h = parseInt(d.hour, 10);
    return h >= 7 && h <= 22;
  });
  const peak = Math.max(...businessHours.map((x) => x.count), 0);

  return (
    <ChartCard
      title="Atendimentos por hora — hoje"
      subtitle={`Pico: ${getPeak(data)}`}
      variant="hourly"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={businessHours} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="barPeak" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={analyticsColors.orangeLight} />
              <stop offset="100%" stopColor={analyticsColors.orange} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={analyticsColors.activeSoft} vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fill: analyticsColors.navyLight, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: analyticsColors.navyLight, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<SimpleTooltip unit="atend." />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {businessHours.map((entry) => (
              <Cell
                key={entry.hour}
                fill={
                  entry.count === peak && entry.count > 0
                    ? "url(#barPeak)"
                    : hourlyBarColor(entry.count, peak)
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function getPeak(data: HourlyPoint[]) {
  if (!data.length) return "—";
  const best = data.reduce((a, b) => (b.count > a.count ? b : a), data[0]);
  return best.count > 0 ? `${best.hour} (${best.count})` : "—";
}

export function WaitDistributionChart({ data }: { data: DistributionPoint[] }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <ChartCard
      title="Distribuição de espera — hoje"
      subtitle="Quanto tempo os clientes aguardaram"
      variant="wait"
    >
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={analyticsColors.insightSoft} horizontal={false} />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: analyticsColors.navyLight, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="range"
              width={72}
              tick={{ fill: analyticsColors.navyLight, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<SimpleTooltip unit="clientes" />} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={waitDistributionColors[i % waitDistributionColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <Clock3 className="h-8 w-8 text-on-surface-variant/40" strokeWidth={1.5} />
          <p className="text-sm text-on-surface-variant">
            Sem atendimentos hoje para exibir distribuição.
          </p>
        </div>
      )}
    </ChartCard>
  );
}

const summaryRows = [
  { key: "avgWaitMinToday", label: "Tempo médio de espera hoje", dot: "bg-violet-500", suffix: " min" },
  { key: "avgServiceMinToday", label: "Tempo médio de atendimento hoje", dot: "bg-brand-navy", suffix: " min" },
  { key: "peakHourLabel", label: "Pico de movimento", dot: "bg-primary" },
  { key: "servedWeek", label: "Atendimentos na semana", dot: "bg-surface-tint" },
  { key: "totalServedAllTime", label: "Total histórico", dot: "bg-secondary" },
  { key: "totalClients", label: "Clientes cadastrados", dot: "bg-emerald-500" },
] as const;

export function OperationsSummary({ dashboard }: { dashboard: AnalyticsDashboard }) {
  const { kpis } = dashboard;

  return (
    <ChartCard title="Resumo operacional" subtitle="Indicadores complementares" variant="summary">
      <ul className="flex h-full flex-col justify-center gap-2">
        {summaryRows.map((row) => {
          const raw = kpis[row.key as keyof typeof kpis];
          const value =
            typeof raw === "number"
              ? `${raw}${"suffix" in row ? row.suffix : ""}`
              : String(raw);

          return (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low/80 px-3 py-2.5 transition-colors hover:bg-surface-container-high"
            >
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-on-surface-variant">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", row.dot)} />
                {row.label}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-on-surface">
                {value}
              </span>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}
