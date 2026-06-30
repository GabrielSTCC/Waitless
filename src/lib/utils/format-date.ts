const FALLBACK = "—";

function resolveLocale(locale: string): string {
  return locale === "en" ? "en-US" : "pt-BR";
}

export function coerceDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof (value as { toDate?: () => Date }).toDate === "function") {
    const date = (value as { toDate: () => Date }).toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "_seconds" in value &&
    typeof (value as { _seconds: unknown })._seconds === "number"
  ) {
    const date = new Date((value as { _seconds: number })._seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatDisplayDate(
  value: unknown,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
): string {
  const date = coerceDate(value);
  if (!date) return FALLBACK;
  try {
    return new Intl.DateTimeFormat(resolveLocale(locale), options).format(date);
  } catch {
    return FALLBACK;
  }
}

export function formatDisplayDateTime(
  value: unknown,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  return formatDisplayDate(value, locale, options);
}
