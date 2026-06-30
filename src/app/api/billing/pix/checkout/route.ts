import { NextRequest, NextResponse } from "next/server";
import type { BillingInterval, PaidPlanTier } from "@/lib/billing/plans";
import { getPlanPrice } from "@/lib/billing/plans";
import {
  buildAsaasExternalReference,
  isAsaasPixEnabled,
  isAsaasSandbox,
} from "@/lib/billing/asaas/config";
import {
  AsaasApiError,
  createAsaasSubscription,
  ensureAsaasPixAddressKey,
  formatAsaasDate,
  formatAsaasPixSetupError,
  getAsaasPixQrCode,
  isInvalidCustomerError,
  listSubscriptionPayments,
  mapIntervalToAsaasCycle,
  resolveAsaasCustomerId,
} from "@/lib/billing/asaas/client";
import { resolveBillingMarketFromCompanyData } from "@/lib/billing/resolve-market";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAdminDb } from "@/lib/firebase/admin";

function parseBody(body: unknown): {
  planId: PaidPlanTier;
  interval: BillingInterval;
  cpfCnpj?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const data = body as Record<string, unknown>;
  const planId = data.planId;
  const interval = data.interval;
  const cpfCnpj = typeof data.cpfCnpj === "string" ? data.cpfCnpj.trim() : undefined;

  if (planId !== "essential" && planId !== "pro") return null;
  if (interval !== "week" && interval !== "month" && interval !== "year") return null;

  return { planId, interval, cpfCnpj };
}

function normalizeCpfCnpj(value: string | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) return null;
  return digits;
}

export async function POST(request: NextRequest) {
  if (!isAsaasPixEnabled()) {
    return NextResponse.json(
      { error: "Pagamento por PIX ainda não configurado no servidor." },
      { status: 503 },
    );
  }

  const authResult = await authenticateRequest(request);
  if (authResult instanceof Response) return authResult;

  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const memberSnap = await db.doc(`members/${authResult.uid}`).get();
    if (!memberSnap.exists) {
      return NextResponse.json({ error: "Membro não encontrado." }, { status: 403 });
    }

    const companyId = memberSnap.data()?.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Empresa não vinculada." }, { status: 403 });
    }

    const companySnap = await db.doc(`companies/${companyId}`).get();
    if (!companySnap.exists) {
      return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
    }

    const companyData = companySnap.data()!;
    if (companyData.ownerId !== authResult.uid) {
      return NextResponse.json(
        { error: "Somente o dono pode gerenciar a assinatura." },
        { status: 403 },
      );
    }

    const billingMarket = resolveBillingMarketFromCompanyData({
      billingMarket: companyData.billingMarket as "BR" | "US" | undefined,
      billingCountry: companyData.billingCountry as "BR" | "US" | undefined,
      legal: companyData.legal as { cnpj?: string } | undefined,
      defaultLocale: companyData.defaultLocale === "en" ? "en" : "pt-BR",
    });

    if (billingMarket !== "BR") {
      return NextResponse.json(
        { error: "PIX está disponível apenas para contas com cobrança em BRL." },
        { status: 403 },
      );
    }

    const planPrice = getPlanPrice(body.planId, billingMarket, body.interval);
    if (!planPrice) {
      return NextResponse.json({ error: "Preço não encontrado para este plano." }, { status: 400 });
    }

    const legalCnpj = (companyData.legal as { cnpj?: string } | undefined)?.cnpj;
    const cpfCnpj = normalizeCpfCnpj(body.cpfCnpj ?? legalCnpj);
    if (!cpfCnpj) {
      return NextResponse.json(
        {
          error:
            "Informe um CPF ou CNPJ válido para gerar a cobrança PIX. Você pode cadastrar o CNPJ em Dados da empresa.",
        },
        { status: 400 },
      );
    }

    const externalReference = buildAsaasExternalReference({
      companyId,
      planId: body.planId,
      interval: body.interval,
    });

    const subscriptionData = companyData.subscription as
      | { asaasCustomerId?: string; asaasSubscriptionId?: string; status?: string }
      | undefined;

    if (
      subscriptionData?.status === "active" &&
      subscriptionData.asaasSubscriptionId
    ) {
      return NextResponse.json(
        { error: "Já existe uma assinatura ativa. Use o portal ou contate o suporte para alterar." },
        { status: 409 },
      );
    }

    await ensureAsaasPixAddressKey();

    const ownerEmail = authResult.email?.trim();
    if (!ownerEmail) {
      return NextResponse.json({ error: "E-mail do usuário não disponível." }, { status: 400 });
    }

    const customerExternalRef = `waitless-company:${companyId}`;
    let customerId = await resolveAsaasCustomerId({
      storedCustomerId: subscriptionData?.asaasCustomerId,
      name: (companyData.name as string) || ownerEmail,
      email: ownerEmail,
      cpfCnpj,
      externalReference: customerExternalRef,
    });

    const subscriptionInput = {
      customerId,
      value: planPrice.amount,
      cycle: mapIntervalToAsaasCycle(body.interval),
      nextDueDate: formatAsaasDate(new Date()),
      description: `Waitless ${body.planId} (${body.interval})`,
      externalReference,
    };

    let subscription;
    try {
      subscription = await createAsaasSubscription(subscriptionInput);
    } catch (error) {
      if (!isInvalidCustomerError(error)) throw error;
      customerId = await resolveAsaasCustomerId({
        name: (companyData.name as string) || ownerEmail,
        email: ownerEmail,
        cpfCnpj,
        externalReference: customerExternalRef,
      });
      subscription = await createAsaasSubscription({
        ...subscriptionInput,
        customerId,
      });
    }

    const payments = await listSubscriptionPayments(subscription.id);
    const pendingPayment =
      payments.find((payment) => payment.status === "PENDING") ?? payments[0];

    if (!pendingPayment) {
      return NextResponse.json(
        { error: "Cobrança PIX não gerada. Tente novamente em instantes." },
        { status: 502 },
      );
    }

    const pix = await getAsaasPixQrCode(pendingPayment.id);
    const payload = pix.payload.trim();

    await db.doc(`companies/${companyId}`).set(
      {
        subscription: {
          paymentProvider: "asaas",
          asaasCustomerId: customerId,
          asaasSubscriptionId: subscription.id,
          pixPendingPaymentId: pendingPayment.id,
          status: "none",
          billingMarket: "BR",
          stripeSubscriptionId: null,
        },
      },
      { merge: true },
    );

    return NextResponse.json({
      pix: {
        paymentId: pendingPayment.id,
        encodedImage: pix.encodedImage,
        payload,
        expirationDate: pix.expirationDate,
        value: planPrice.amount,
        currency: planPrice.currency,
        sandboxMode: isAsaasSandbox(),
      },
    });
  } catch (error) {
    console.error("[billing/pix/checkout]", error);
    if (error instanceof AsaasApiError) {
      return NextResponse.json(
        { error: formatAsaasPixSetupError(error.message) },
        { status: 502 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Não foi possível gerar o PIX.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
