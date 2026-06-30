import { NextRequest, NextResponse } from "next/server";
import { sendPlatformAlert } from "@/lib/email/send-platform-alert";
import { getRequestMeta } from "@/lib/platform/request-meta";

export const runtime = "nodejs";

const ALLOWED_EVENTS = new Set([
  "login_failed_password",
  "login_failed_unauthorized",
]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      event?: unknown;
      attemptedEmail?: unknown;
    };

    const event = typeof body.event === "string" ? body.event : "";
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
    }

    const meta = getRequestMeta(request);
    const attemptedEmail =
      typeof body.attemptedEmail === "string" ? body.attemptedEmail : undefined;

    await sendPlatformAlert(
      event as "login_failed_password" | "login_failed_unauthorized",
      { ...meta, attemptedEmail },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[platform/auth/notify]", error);
    return NextResponse.json({ error: "Falha ao enviar notificação." }, { status: 500 });
  }
}
