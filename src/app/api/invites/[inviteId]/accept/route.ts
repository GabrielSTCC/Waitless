import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import {
  AcceptInviteError,
  acceptInviteServer,
} from "@/lib/invites/accept-invite-server";

export const runtime = "nodejs";

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
      const status =
        error.code === "already_member"
          ? 409
          : error.code === "email_mismatch"
            ? 403
            : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    const message = isCredentialError(error)
      ? CREDENTIAL_SETUP_MESSAGE
      : error instanceof Error
        ? error.message
        : "Falha ao aceitar convite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
