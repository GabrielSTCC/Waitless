import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, publicErrorMessage } from "@/lib/firebase/admin";
import { respondToSpotOfferServer } from "@/lib/firebase/vacancy-server";
import { reportError } from "@/lib/observability/report-error";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let companyId = "";
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const response = body.response;

    if (!token) {
      return NextResponse.json({ error: "token obrigatório" }, { status: 400 });
    }
    if (response !== "accept" && response !== "decline") {
      return NextResponse.json({ error: "response inválida" }, { status: 400 });
    }

    const db = getAdminDb();
    const publicSnap = await db.doc(`publicQueue/${token}`).get();
    if (publicSnap.exists) {
      const data = publicSnap.data();
      companyId = typeof data?.companyId === "string" ? data.companyId : "";
    }

    const result = await respondToSpotOfferServer(token, response === "accept");
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = publicErrorMessage(error, "Falha ao processar resposta.");
    void reportError(error, { route: "/api/queue/spot-offer/respond", companyId });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
