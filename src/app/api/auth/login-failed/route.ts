import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { handleAuthApiError } from "@/lib/auth/api-error";
import { recordFailedLogin } from "@/lib/auth/two-factor-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
