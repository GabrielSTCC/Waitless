import { NextRequest, NextResponse } from "next/server";
import { canUseWhatsappApi } from "@/lib/billing/plan-limits";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { canAccessRoute } from "@/lib/permissions";
import type { Company } from "@/lib/types";

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
    const memberSnap = await getAdminDb().doc(`members/${auth.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
    }

    const member = memberSnap.data()!;
    const role = member.role as string | undefined;
    if (!canAccessRoute(role, "/admin")) {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
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

    const { to, message } = await request.json();
    if (!to || !message) {
      return NextResponse.json({ error: "to e message obrigatórios" }, { status: 400 });
    }

    const digits = String(to).replace(/\D/g, "");
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

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data }, { status: res.status });
    }

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ error: "Falha ao enviar mensagem" }, { status: 500 });
  }
}
