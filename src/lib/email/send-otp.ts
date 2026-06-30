export async function sendOtpEmail(
  email: string,
  code: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEV] OTP para ${email}: ${code}`);
      return;
    }
    throw new Error("Serviço de e-mail não configurado.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Seu código de verificação — Waitless",
      text: `Seu código de verificação é: ${code}\n\nEle expira em 10 minutos. Se você não solicitou este código, ignore este e-mail.`,
      html: `<p>Seu código de verificação é:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>Ele expira em 10 minutos. Se você não solicitou este código, ignore este e-mail.</p>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Falha ao enviar e-mail: ${body || response.statusText}`);
  }
}
