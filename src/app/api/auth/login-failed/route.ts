import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { handleAuthApiError } from "@/lib/auth/api-error";
import { recordFailedLogin } from "@/lib/auth/two-factor-server";
import {
  checkRateLimit,
  getRequestIp,
  rateLimitResponse,
} from "@/lib/rate-limit/check-rate-limit";

export const runtime = "nodejs";

function looksLikeEmail(value: string): boolean {
  const at = value.indexOf("@");
  if (at <= 0 || at !== value.lastIndexOf("@")) return false;
  const domain = value.slice(at + 1);
  const dot = domain.indexOf(".");
  return (
    dot > 0 &&
    dot < domain.length - 1 &&
    !value.includes(" ") &&
    !value.includes("\t")
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getRequestIp(request);
    const ipLimit = await checkRateLimit(`login-failed:ip:${ip}`, 10, 15 * 60_000);
    if (!ipLimit.ok) {
      const { body, init } = rateLimitResponse(ipLimit);
      return NextResponse.json(body, init);
    }

    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !looksLikeEmail(email)) {
      return NextResponse.json({ ok: true });
    }

    const emailKey = email.toLowerCase();
    const emailLimit = await checkRateLimit(
      `login-failed:email:${emailKey}`,
      5,
      60 * 60_000,
    );
    if (!emailLimit.ok) {
      // Resposta genérica — não revelar throttling por e-mail
      return NextResponse.json({ ok: true });
    }

    await recordFailedLogin(getAdminDb(), email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAuthApiError(
      "auth/login-failed",
      error,
      "Falha ao registrar tentativa.",
    );
  }
}
