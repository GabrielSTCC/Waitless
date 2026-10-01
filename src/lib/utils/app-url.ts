/**
 * Base URL pública do app para links compartilhados (WhatsApp, convites, fila).
 * Prefer NEXT_PUBLIC_APP_URL em produção — localhost não vira link clicável no WhatsApp.
 */
export function trimTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charAt(end - 1) === "/") end -= 1;
  return end === value.length ? value : value.slice(0, end);
}

function getVercelDeploymentUrl(): string {
  const vercelUrl = trimTrailingSlashes(process.env.VERCEL_URL?.trim() ?? "");
  if (!vercelUrl) return "";
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
}

export function getPublicAppBaseUrl(fallbackOrigin?: string): string {
  const fromEnv = trimTrailingSlashes(process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "");
  if (fromEnv) return fromEnv;

  const fromVercel = getVercelDeploymentUrl();
  if (fromVercel) return fromVercel;

  const fallback = trimTrailingSlashes(fallbackOrigin?.trim() ?? "");
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

/** Estabelecimento marca o horário e envia o link na hora. */
export function buildAppointmentStaffLinkMessage(
  clientName: string,
  companyName: string,
  whenLabel: string,
  publicToken: string,
  fallbackOrigin?: string,
): string {
  const link = buildQueuePublicUrl(publicToken, fallbackOrigin);
  const lines = [
    `Olá ${clientName}! Aqui é a equipe da ${companyName}.`,
    "",
    `Seu horário está marcado para ${whenLabel}. Confirme que você vem pelo link. É nele também que você acompanha a fila:`,
  ];
  if (link) lines.push(link);
  return lines.join("\n");
}

/** Estabelecimento → cliente: confirmar presença perto do horário */
export function buildAppointmentConfirmMessage(
  clientName: string,
  companyName: string,
  publicToken: string,
  fallbackOrigin?: string,
): string {
  const link = buildQueuePublicUrl(publicToken, fallbackOrigin);
  const lines = [
    `Olá ${clientName}! Aqui é a equipe da ${companyName}.`,
    "",
    "Seu horário está chegando. Confirme que você vem pelo link. É nele também que você acompanha a fila:",
  ];
  if (link) lines.push(link);
  return lines.join("\n");
}

/** Aviso a outros clientes do dia: alguém cancelou */
export function buildAppointmentPeerCancelMessage(
  clientName: string,
  companyName: string,
  freedTimeLabel: string,
  publicToken: string,
  fallbackOrigin?: string,
): string {
  const link = buildQueuePublicUrl(publicToken, fallbackOrigin);
  const lines = [
    `Olá ${clientName}! Aqui é a equipe da ${companyName}.`,
    "",
    `Um cliente desmarcou o horário das ${freedTimeLabel} hoje. Seu agendamento segue mantido.`,
  ];
  if (link) {
    lines.push("", "Acompanhe pelo link:");
    lines.push(link);
  }
  return lines.join("\n");
}

/** Oferta de horário liberado (lista de espera informal) */
export function buildAppointmentSlotFreedMessage(
  clientName: string,
  companyName: string,
  freedTimeLabel: string,
  publicToken: string,
  fallbackOrigin?: string,
): string {
  const link = buildQueuePublicUrl(publicToken, fallbackOrigin);
  const lines = [
    `Olá ${clientName}! Aqui é a equipe da ${companyName}.`,
    "",
    `Ficou livre o horário das ${freedTimeLabel} hoje. Se quiser trocar o seu, fale com a gente ou use o link:`,
  ];
  if (link) lines.push(link);
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
