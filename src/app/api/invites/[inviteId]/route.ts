import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { getInvitePreviewServer } from "@/lib/invites/accept-invite-server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await context.params;
    if (!inviteId?.trim()) {
      return NextResponse.json({ error: "Convite inválido." }, { status: 400 });
    }

    const preview = await getInvitePreviewServer(getAdminDb(), inviteId.trim());
    return NextResponse.json(preview);
  } catch (error) {
    const message = isCredentialError(error)
      ? CREDENTIAL_SETUP_MESSAGE
      : error instanceof Error
        ? error.message
        : "Falha ao carregar convite.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
