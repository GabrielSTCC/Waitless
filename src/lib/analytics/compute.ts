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

function hourlyFromCompleted(completedToday: QueueEntry[]): {
  hourlyToday: HourlyPoint[];
  peakHourLabel: string;
} {
  const hourlyMap = new Map<number, number>();
  for (let hour = 0; hour < 24; hour++) hourlyMap.set(hour, 0);
  for (const entry of completedToday) {
    if (!entry.completedAt) continue;
    const hour = entry.completedAt.getHours();
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + 1);
  }

  let peakHour = 0;
  let peakCount = 0;
  for (const [hour, count] of hourlyMap) {
    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
    }
  }

  return {
    hourlyToday: Array.from(hourlyMap.entries()).map(([hour, count]) => ({
      hour: formatHour(hour),
      count,
    })),
    peakHourLabel: peakCount > 0 ? formatHour(peakHour) : "—",
  };
}

function dailyWeekFrom(now: Date, completedWeek: QueueEntry[]): DailyPoint[] {
  const dailyMap = new Map<string, { count: number; waitSum: number }>();
  for (let i = 6; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(day.getDate() - i);
    dailyMap.set(startOfDay(day).toISOString().slice(0, 10), { count: 0, waitSum: 0 });
  }

  for (const entry of completedWeek) {
    if (!entry.completedAt) continue;
    const key = startOfDay(entry.completedAt).toISOString().slice(0, 10);
    const bucket = dailyMap.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.waitSum += waitMinutes(entry);
  }

  return Array.from(dailyMap.entries()).map(([date, value]) => ({
    date,
    label: formatDayLabel(new Date(date + "T12:00:00")),
    count: value.count,
    avgWaitMin: value.count > 0 ? Math.round(value.waitSum / value.count) : 0,
  }));
}

function waitDistributionFrom(completedToday: QueueEntry[]): DistributionPoint[] {
  const waitBuckets = [
    { range: "0–5 min", min: 0, max: 5 },
    { range: "6–15 min", min: 6, max: 15 },
    { range: "16–30 min", min: 16, max: 30 },
    { range: "31+ min", min: 31, max: Infinity },
  ];
  return waitBuckets.map((bucket) => ({
    range: bucket.range,
    count: completedToday.filter((entry) => {
      const minutes = waitMinutes(entry);
      return minutes >= bucket.min && minutes <= bucket.max;
    }).length,
  }));
}

function roundedAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
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
  const { hourlyToday, peakHourLabel } = hourlyFromCompleted(completedToday);
  const waitTimesToday = completedToday.map(waitMinutes);
  const serviceTimesToday = completedToday.map(serviceMinutes).filter((minutes) => minutes > 0);
  const returningRate = returningRateFrom(completedToday.length, input.totalClients);

  return {
    kpis: {
      servedToday: completedToday.length,
      servedWeek: completedWeek.length,
      waitingNow: input.waitingNow,
      inServiceNow: input.inServiceNow,
      totalClients: input.totalClients,
      totalServedAllTime: input.totalServedAllTime,
      avgWaitMinToday: roundedAverage(waitTimesToday),
      avgServiceMinToday: roundedAverage(serviceTimesToday),
      peakHourLabel,
      returningRate,
    },
    hourlyToday,
    dailyWeek: dailyWeekFrom(now, completedWeek),
    waitDistribution: waitDistributionFrom(completedToday),
  };
}

function returningRateFrom(returningVisits: number, totalClients: number): number {
  if (returningVisits <= 0 || totalClients <= 0) return 0;
  return Math.min(100, Math.round((returningVisits / totalClients) * 100));
}
