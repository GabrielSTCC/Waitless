import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, isCredentialError } from "@/lib/firebase/admin";
import { isNextResponse, verifyPlatformRequest } from "@/lib/platform/api-auth";
import { mapAuditDoc } from "@/lib/platform/audit";

export async function GET(request: NextRequest) {
  const authResult = await verifyPlatformRequest(request);
  if (isNextResponse(authResult)) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId") ?? undefined;
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
    const pageSize = Math.min(Number(searchParams.get("pageSize") ?? "30"), 100);

    const db = getAdminDb();
    let entries;

    if (companyId) {
      const snap = await db
        .collection("platformAudit")
        .where("targetCompanyId", "==", companyId)
        .get();
      entries = snap.docs
        .map((doc) => mapAuditDoc(doc.id, doc.data()))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else {
      const snap = await db
        .collection("platformAudit")
        .orderBy("createdAt", "desc")
        .limit(pageSize * page)
        .get();
      entries = snap.docs.map((doc) => mapAuditDoc(doc.id, doc.data()));
    }

    const start = (page - 1) * pageSize;
    const pageEntries = entries.slice(start, start + pageSize);

    return NextResponse.json({
      entries: pageEntries,
      total: entries.length,
      page,
      pageSize,
    });
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: "Credenciais Firebase indisponíveis." }, { status: 503 });
    }
    console.error("[platform/audit]", error);
    return NextResponse.json({ error: "Erro ao carregar auditoria." }, { status: 500 });
  }
}
