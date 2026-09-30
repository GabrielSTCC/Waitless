import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, publicErrorMessage } from "@/lib/firebase/admin";
import { withdrawFromQueueServer } from "@/lib/firebase/vacancy-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
    }

    getAdminDb();
    const result = await withdrawFromQueueServer(token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      alreadyCancelled: result.alreadyCancelled ?? false,
    });
  } catch (error) {
    const message = publicErrorMessage(error, "Falha ao desmarcar.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
