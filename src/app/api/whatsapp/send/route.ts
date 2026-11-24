import { NextRequest, NextResponse } from "next/server";
import { canUseWhatsappApi } from "@/lib/billing/plan-limits";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { canManageCompany, normalizeRole } from "@/lib/permissions";
import type { Company } from "@/lib/types";
import {
  checkRateLimit,
  getRequestIp,
  rateLimitResponse,
} from "@/lib/rate-limit/check-rate-limit";
import {
  normalizeWhatsapp,
  stripWhatsappCountry55,
} from "@/lib/utils/format";

const MAX_MESSAGE_LEN = 1000;

async function isKnownCompanyRecipient(
  companyId: string,
  digits: string,
): Promise<boolean> {
  const db = getAdminDb();
  const candidates = Array.from(
    new Set(
      [digits, stripWhatsappCountry55(digits)].filter((d) => d.length >= 10),
    ),
  );
  for (const candidate of candidates) {
    const inClients = await db
      .collection(`companies/${companyId}/clients`)
      .where("normalizedWhatsapp", "==", candidate)
      .limit(1)
      .get();
    if (!inClients.empty) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (auth instanceof Response) return auth;

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return NextResponse.json(
      { error: "WhatsApp Business API não configurada" },
      { status: 503 },
    );
  }

  try {
    const ip = getRequestIp(request);
    const limited = await checkRateLimit(
      `wa-send:${auth.uid}:${ip}`,
      20,
      60 * 60_000,
    );
    if (!limited.ok) {
      const { body, init } = rateLimitResponse(limited);
      return NextResponse.json(body, init);
    }

    const memberSnap = await getAdminDb().doc(`members/${auth.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
    }

    const member = memberSnap.data()!;
    const role = normalizeRole(member.role as string | undefined);
    if (!canManageCompany(role)) {
      return NextResponse.json(
        { error: "Apenas dono ou admin podem enviar WhatsApp." },
        { status: 403 },
      );
    }

    const companyId = member.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não vinculada." }, { status: 403 });
    }

    const companySnap = await getAdminDb().doc(`companies/${companyId}`).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    const company = {
      id: companyId,
      name: (companyData.name as string) ?? "",
      ownerId: (companyData.ownerId as string) ?? "",
      avgServiceTimeMin: (companyData.avgServiceTimeMin as number) ?? 10,
      toleranceEnabled: companyData.toleranceEnabled === true,
      toleranceMin: (companyData.toleranceMin as number) ?? 5,
      defaultLocale: companyData.defaultLocale === "en" ? "en" : "pt-BR",
      subscription: companyData.subscription as Company["subscription"],
      createdAt: new Date(),
    } satisfies Company;

    if (!canUseWhatsappApi(company)) {
      return NextResponse.json(
        { error: "WhatsApp Business API disponível apenas no plano Pro." },
        { status: 403 },
      );
    }

    const payload = (await request.json().catch(() => ({}))) as {
      to?: unknown;
      message?: unknown;
    };
    const to = typeof payload.to === "string" ? payload.to : "";
    const message = typeof payload.message === "string" ? payload.message.trim() : "";

    if (!to || !message) {
      return NextResponse.json({ error: "to e message obrigatórios" }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LEN) {
      return NextResponse.json(
        { error: "Mensagem excede o tamanho máximo." },
        { status: 400 },
      );
    }

    const digits = normalizeWhatsapp(to);
    if (digits.length < 10 || digits.length > 15) {
      return NextResponse.json({ error: "Número inválido." }, { status: 400 });
    }

    if (!(await isKnownCompanyRecipient(companyId, digits))) {
      return NextResponse.json(
        { error: "Destinatário fora da base/fila do estabelecimento." },
        { status: 403 },
      );
    }

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: digits,
        type: "text",
        text: { body: message },
      }),
    });

    if (!res.ok) {
      console.error("[whatsapp/send] Graph API error", res.status);
      return NextResponse.json(
        { error: "Falha ao enviar mensagem via WhatsApp." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
  }
}
