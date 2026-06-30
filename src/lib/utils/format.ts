export function normalizeWhatsapp(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function formatWhatsappDisplay(digits: string): string {
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    const local = digits.slice(2);
    return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  return digits;
}

/** Masks WhatsApp for public client profile — shows last 4 digits only. */
export function maskWhatsappDisplay(digits: string): string {
  const normalized = normalizeWhatsapp(digits);
  if (normalized.length < 4) return "••••";
  const last4 = normalized.slice(-4);
  if (normalized.length === 11 || (normalized.length === 13 && normalized.startsWith("55"))) {
    return `(••) •••••-${last4}`;
  }
  return `••••${last4}`;
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
