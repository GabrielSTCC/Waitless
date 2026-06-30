import { getLegalConfig } from "@/lib/legal/config";
import type { SupportCategory } from "@/lib/support/categories";

export interface SupportReportEmailContext {
  category: SupportCategory;
  categoryLabel: string;
  customCategory?: string;
  description: string;
  companyName: string;
  companyId: string;
  userEmail: string;
  userId: string;
  userRole: string;
  timestamp: string;
}

function getSupportEmailTo(): string {
  return getLegalConfig().supportEmail;
}

function buildSubject(ctx: SupportReportEmailContext): string {
  const categoryPart =
    ctx.category === "other" && ctx.customCategory
      ? ctx.customCategory
      : ctx.categoryLabel;
  return `[Waitless Suporte] ${categoryPart} — ${ctx.companyName}`;
}

function buildTextBody(ctx: SupportReportEmailContext): string {
  const categoryLine =
    ctx.category === "other" && ctx.customCategory
      ? `Categoria: Outro — ${ctx.customCategory}`
      : `Categoria: ${ctx.categoryLabel}`;

  return [
    "Novo reporte de suporte — Waitless",
    "",
    categoryLine,
    "",
    "Descrição:",
    ctx.description,
    "",
    "---",
    `Estabelecimento: ${ctx.companyName}`,
    `ID da empresa: ${ctx.companyId}`,
    `E-mail do usuário: ${ctx.userEmail}`,
    `UID: ${ctx.userId}`,
    `Papel: ${ctx.userRole}`,
    `Data/hora: ${ctx.timestamp}`,
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlBody(ctx: SupportReportEmailContext): string {
  const categoryLine =
    ctx.category === "other" && ctx.customCategory
      ? `Outro — ${escapeHtml(ctx.customCategory)}`
      : escapeHtml(ctx.categoryLabel);

  return [
    "<p><strong>Novo reporte de suporte — Waitless</strong></p>",
    `<p><strong>Categoria:</strong> ${categoryLine}</p>`,
    "<p><strong>Descrição:</strong></p>",
    `<p style="white-space:pre-wrap">${escapeHtml(ctx.description)}</p>`,
    "<hr/>",
    `<p><strong>Estabelecimento:</strong> ${escapeHtml(ctx.companyName)}</p>`,
    `<p><strong>ID da empresa:</strong> ${escapeHtml(ctx.companyId)}</p>`,
    `<p><strong>E-mail do usuário:</strong> ${escapeHtml(ctx.userEmail)}</p>`,
    `<p><strong>UID:</strong> ${escapeHtml(ctx.userId)}</p>`,
    `<p><strong>Papel:</strong> ${escapeHtml(ctx.userRole)}</p>`,
    `<p><strong>Data/hora:</strong> ${escapeHtml(ctx.timestamp)}</p>`,
  ].join("");
}

export async function sendSupportReportEmail(
  ctx: SupportReportEmailContext,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = getSupportEmailTo();
  const subject = buildSubject(ctx);
  const text = buildTextBody(ctx);
  const html = buildHtmlBody(ctx);

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEV] Support report → ${to}:\n`, text);
      return;
    }
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: ctx.userEmail,
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao enviar e-mail: ${body || response.statusText}`);
  }
}
