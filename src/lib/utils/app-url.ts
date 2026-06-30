/**
 * Base URL pública do app para links compartilhados (WhatsApp, convites, fila).
 * Prefer NEXT_PUBLIC_APP_URL em produção — localhost não vira link clicável no WhatsApp.
 */
function getVercelDeploymentUrl(): string {
  const vercelUrl = process.env.VERCEL_URL?.trim().replace(/\/+$/, "");
  if (!vercelUrl) return "";
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
}

export function getPublicAppBaseUrl(fallbackOrigin?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  const fromVercel = getVercelDeploymentUrl();
  if (fromVercel) return fromVercel;

  const fallback = fallbackOrigin?.trim().replace(/\/+$/, "");
  return fallback ?? "";
}

export function buildQueuePublicUrl(token: string, fallbackOrigin?: string): string {
  const base = getPublicAppBaseUrl(fallbackOrigin);
  if (!base || !token) return "";
  return `${base}/q/${token}`;
}

export function isWhatsAppLinkableUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    if (hostname === "localhost" || hostname === "127.0.0.1") return false;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Mensagem com URL em linha isolada — melhora detecção de link no WhatsApp. */
export function buildWhatsAppQueueMessage(
  clientName: string,
  position: number,
  publicToken: string,
  fallbackOrigin?: string,
): string {
  const link = buildQueuePublicUrl(publicToken, fallbackOrigin);
  if (!link) {
    return `Olá ${clientName}! Você está na posição ${position} da fila.`;
  }
  return `Olá ${clientName}! Você está na posição ${position} da fila.\n\nAcompanhe em tempo real:\n${link}`;
}

/** Staff → cliente: vaga aberta por imprevisto */
export function buildVacancyWhatsAppMessage(
  clientName: string,
  companyName: string,
  publicToken: string,
  fallbackOrigin?: string,
): string {
  const link = buildQueuePublicUrl(publicToken, fallbackOrigin);
  const lines = [
    `Olá ${clientName}! Aqui é a equipe da ${companyName}.`,
    "",
    "Tivemos um imprevisto e uma vaga abriu para atendimento agora. Você pode vir ao local imediatamente?",
  ];
  if (link) {
    lines.push("", "Acompanhe em tempo real:", link);
  }
  return lines.join("\n");
}

/** Cliente → empresa: aviso de desmarcação */
export function buildWithdrawWhatsAppMessage(
  clientName: string,
  companyName: string,
): string {
  return `Olá! Sou ${clientName}. Desmarquei meu lugar na fila da ${companyName}.\n\nMotivo: `;
}

export function buildWhatsAppWaMeUrl(phoneDigits: string, message: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
