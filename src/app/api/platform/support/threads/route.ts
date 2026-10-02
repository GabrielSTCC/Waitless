import { NextRequest, NextResponse } from "next/server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { listSupportThreads } from "@/lib/support/chat-server";

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const db = getAdminDb();
    const threads = await listSupportThreads(db);
    const sorted = [...threads].sort((a, b) => {
      if (b.unreadForPlatform !== a.unreadForPlatform) {
        return b.unreadForPlatform - a.unreadForPlatform;
      }
      const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
      const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ threads: sorted });
  } catch (err) {
    if (isCredentialError(err)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }
    console.error("[platform/support/threads GET]", err);
    return NextResponse.json(
      { error: "Não foi possível listar os chats." },
      { status: 500 },
    );
  }
}
