import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getAdminDb,
  publicErrorMessage,
} from "@/lib/firebase/admin";
import {
  AcceptInviteError,
  acceptInviteServer,
} from "@/lib/invites/accept-invite-server";

export const runtime = "nodejs";

function acceptInviteHttpStatus(code: string): number {
  if (code === "already_member") return 409;
  if (code === "email_mismatch") return 403;
  return 400;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ inviteId: string }> },
) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const { inviteId } = await context.params;
    if (!inviteId?.trim()) {
      return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
    }

    const email = authResult.email?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Conta sem e-mail. Use o e-mail do convite." },
        { status: 400 },
      );
    }

    const result = await acceptInviteServer(
      getAdminDb(),
      inviteId.trim(),
      authResult.uid,
      email,
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AcceptInviteError) {
      const status = acceptInviteHttpStatus(error.code);
      return NextResponse.json({ error: error.message }, { status });
    }

    const message = publicErrorMessage(error, "Falha ao aceitar convite.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
