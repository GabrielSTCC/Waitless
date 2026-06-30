import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { loadSessionServer } from "@/lib/auth/session-server";
import {
  CREDENTIAL_SETUP_MESSAGE,
  getAdminDb,
  isCredentialError,
} from "@/lib/firebase/admin";
import { loadQueueServer } from "@/lib/queue/queue-server";
import {
  addToQueueServer,
  ClientAlreadyInQueueError,
  PlanLimitError,
  updateQueueStatusServer,
  TrialExpiredError,
} from "@/lib/queue/queue-mutations-server";
import type { QueueStatus } from "@/lib/types";

export const runtime = "nodejs";

async function authorizeCompanyAccess(uid: string, companyId: string) {
  const db = getAdminDb();
  const session = await loadSessionServer(db, uid);
  if (!session.member || session.member.companyId !== companyId) {
    return null;
  }
  return { db, session };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const companyId = request.nextUrl.searchParams.get("companyId")?.trim();
    if (!companyId) {
      return NextResponse.json({ error: "companyId é obrigatório." }, { status: 400 });
    }

    const authorized = await authorizeCompanyAccess(authResult.uid, companyId);
    if (!authorized) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const snapshot = await loadQueueServer(authorized.db, companyId);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/queue GET]", error);
    return NextResponse.json({ error: "Erro ao carregar fila." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json()) as {
      companyId?: string;
      name?: string;
      whatsapp?: string;
      avgServiceTimeMin?: number;
    };

    const companyId = body.companyId?.trim();
    const name = body.name?.trim();
    const whatsapp = body.whatsapp?.trim();

    if (!companyId || !name || !whatsapp) {
      return NextResponse.json(
        { error: "companyId, name e whatsapp são obrigatórios." },
        { status: 400 },
      );
    }

    const authorized = await authorizeCompanyAccess(authResult.uid, companyId);
    if (!authorized) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    const avgServiceTimeMin =
      body.avgServiceTimeMin ?? authorized.session.company?.avgServiceTimeMin ?? 10;

    const entryId = await addToQueueServer(
      authorized.db,
      companyId,
      { name, whatsapp },
      avgServiceTimeMin,
    );

    return NextResponse.json({ entryId });
  } catch (error) {
    if (error instanceof ClientAlreadyInQueueError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof PlanLimitError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof TrialExpiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/queue POST]", error);
    return NextResponse.json({ error: "Erro ao adicionar à fila." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    if (authResult instanceof Response) return authResult;

    const body = (await request.json()) as {
      companyId?: string;
      entryId?: string;
      status?: QueueStatus;
    };

    const companyId = body.companyId?.trim();
    const entryId = body.entryId?.trim();
    const status = body.status;

    if (!companyId || !entryId || !status) {
      return NextResponse.json(
        { error: "companyId, entryId e status são obrigatórios." },
        { status: 400 },
      );
    }

    if (!["waiting", "in_service", "completed", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const authorized = await authorizeCompanyAccess(authResult.uid, companyId);
    if (!authorized) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    await updateQueueStatusServer(authorized.db, companyId, entryId, status);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof TrialExpiredError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (isCredentialError(error)) {
      return NextResponse.json({ error: CREDENTIAL_SETUP_MESSAGE }, { status: 503 });
    }

    console.error("[admin/queue PATCH]", error);
    return NextResponse.json({ error: "Erro ao atualizar fila." }, { status: 500 });
  }
}
