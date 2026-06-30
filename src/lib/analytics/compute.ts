import type { QueueEntry } from "@/lib/types";

export interface AnalyticsKpis {
  servedToday: number;
  servedWeek: number;
  waitingNow: number;
  inServiceNow: number;
  totalClients: number;
  totalServedAllTime: number;
  avgWaitMinToday: number;
  avgServiceMinToday: number;
  peakHourLabel: string;
  returningRate: number;
}

export interface HourlyPoint {
  hour: string;
  count: number;
}

export interface DailyPoint {
  date: string;
  label: string;
  count: number;
  avgWaitMin: number;
}

export interface DistributionPoint {
  range: string;
  count: number;
}

export interface AnalyticsDashboard {
  kpis: AnalyticsKpis;
  hourlyToday: HourlyPoint[];
  dailyWeek: DailyPoint[];
  waitDistribution: DistributionPoint[];
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function waitMinutes(entry: QueueEntry): number {
  if (!entry.completedAt) return 0;
  const end = entry.completedAt.getTime();
  const start = entry.createdAt.getTime();
  return Math.max(0, Math.round((end - start) / 60000));
}

function serviceMinutes(entry: QueueEntry): number {
  if (!entry.completedAt || !entry.startedAt) return 0;
  return Math.max(
    0,
    Math.round((entry.completedAt.getTime() - entry.startedAt.getTime()) / 60000),
  );
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}h`;
}

function formatDayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
}

export function buildAnalyticsDashboard(input: {
  completed: QueueEntry[];
  waitingNow: number;
  inServiceNow: number;
  totalClients: number;
  totalServedAllTime: number;
  now?: Date;
}): AnalyticsDashboard {
  const now = input.now ?? new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const completedWeek = input.completed.filter(
    (e) => e.completedAt && e.completedAt >= weekStart,
  );
  const completedToday = completedWeek.filter(
    (e) => e.completedAt && isSameDay(e.completedAt, now),
  );

  const hourlyMap = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, 0);
  for (const entry of completedToday) {
    if (!entry.completedAt) continue;
    const h = entry.completedAt.getHours();
    hourlyMap.set(h, (hourlyMap.get(h) ?? 0) + 1);
  }

  let peakHour = 0;
  let peakCount = 0;
  for (const [h, count] of hourlyMap) {
    if (count > peakCount) {
      peakCount = count;
      peakHour = h;
    }
  }

  const hourlyToday: HourlyPoint[] = Array.from(hourlyMap.entries()).map(
    ([h, count]) => ({ hour: formatHour(h), count }),
  );

  const dailyMap = new Map<string, { count: number; waitSum: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = startOfDay(d).toISOString().slice(0, 10);
    dailyMap.set(key, { count: 0, waitSum: 0 });
  }

  for (const entry of completedWeek) {
    if (!entry.completedAt) continue;
    const key = startOfDay(entry.completedAt).toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.waitSum += waitMinutes(entry);
  }

  const dailyWeek: DailyPoint[] = Array.from(dailyMap.entries()).map(([date, v]) => {
    const d = new Date(date + "T12:00:00");
    return {
      date,
      label: formatDayLabel(d),
      count: v.count,
      avgWaitMin: v.count > 0 ? Math.round(v.waitSum / v.count) : 0,
    };
  });

  const waitBuckets = [
    { range: "0–5 min", min: 0, max: 5 },
    { range: "6–15 min", min: 6, max: 15 },
    { range: "16–30 min", min: 16, max: 30 },
    { range: "31+ min", min: 31, max: Infinity },
  ];

  const waitDistribution: DistributionPoint[] = waitBuckets.map((b) => ({
    range: b.range,
    count: completedToday.filter((e) => {
      const w = waitMinutes(e);
      return w >= b.min && w <= b.max;
    }).length,
  }));

  const waitTimesToday = completedToday.map(waitMinutes);
  const serviceTimesToday = completedToday.map(serviceMinutes).filter((m) => m > 0);

  const avgWaitMinToday =
    waitTimesToday.length > 0
      ? Math.round(waitTimesToday.reduce((a, b) => a + b, 0) / waitTimesToday.length)
      : 0;

  const avgServiceMinToday =
    serviceTimesToday.length > 0
      ? Math.round(serviceTimesToday.reduce((a, b) => a + b, 0) / serviceTimesToday.length)
      : 0;

  const returningVisits = completedToday.length;
  const returningRate =
    returningVisits > 0 && input.totalClients > 0
      ? Math.min(100, Math.round((returningVisits / input.totalClients) * 100))
      : 0;

  return {
    kpis: {
      servedToday: completedToday.length,
      servedWeek: completedWeek.length,
      waitingNow: input.waitingNow,
      inServiceNow: input.inServiceNow,
      totalClients: input.totalClients,
      totalServedAllTime: input.totalServedAllTime,
      avgWaitMinToday,
      avgServiceMinToday,
      peakHourLabel: peakCount > 0 ? formatHour(peakHour) : "—",
      returningRate,
    },
    hourlyToday,
    dailyWeek,
    waitDistribution,
  };
}
