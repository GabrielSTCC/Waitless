import { getPlatformAdminEmail } from "@/lib/platform/auth";

export type PlatformAlertEvent =
  | "otp_sent"
  | "login_success"
  | "login_failed_password"
  | "login_failed_unauthorized"
  | "otp_failed"
  | "access_denied";

const SUBJECTS: Record<PlatformAlertEvent, string> = {
  otp_sent: "Código de acesso ao painel Waitless",
  login_success: "Login no painel da plataforma — Waitless",
  login_failed_password: "Tentativa de login falhou — senha incorreta",
  login_failed_unauthorized: "Tentativa de login negada — e-mail não autorizado",
  otp_failed: "Código de verificação incorreto — painel Waitless",
  access_denied: "Tentativa de acesso à API da plataforma negada",
};

interface PlatformAlertMeta {
  ip?: string;
  deviceLabel?: string;
  timestamp?: string;
  trustedDevice?: boolean;
  attemptedEmail?: string;
  otpCode?: string;
}

function buildBody(event: PlatformAlertEvent, meta: PlatformAlertMeta): string {
  const lines = [
    `Evento: ${event}`,
    meta.timestamp ? `Data/hora: ${meta.timestamp}` : null,
    meta.ip ? `IP: ${meta.ip}` : null,
    meta.deviceLabel ? `Dispositivo: ${meta.deviceLabel}` : null,
    meta.attemptedEmail ? `E-mail tentado: ${meta.attemptedEmail}` : null,
    meta.trustedDevice ? "Aparelho confiável: sim" : null,
    meta.otpCode ? `Código OTP: ${meta.otpCode}` : null,
    "",
    "Se você não reconhece esta atividade, altere sua senha imediatamente.",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function sendPlatformAlert(
  event: PlatformAlertEvent,
  meta: PlatformAlertMeta = {},
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = getPlatformAdminEmail();
  const subject = SUBJECTS[event];
  const text = buildBody(event, meta);

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEV] Platform alert (${event}) → ${to}:`, text);
      return true;
    }
    console.error(`[platform-alert] RESEND não configurado (${event})`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${subject} — Waitless`,
        text,
        html: text.split("\n").map((line) => `<p>${line}</p>`).join(""),
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(
        `[platform-alert] Falha ao enviar (${event}):`,
        body || response.statusText,
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[platform-alert] Erro ao enviar (${event}):`, err);
    return false;
  }
}
