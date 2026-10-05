# Piloto fechado e plano de escala

Documento operacional: quando aceitar clientes, checklist por estabelecimento e o que melhorar conforme o número de assinantes cresce.

## Veredito

| Modo | Pronto? |
|------|---------|
| **Piloto fechado** (você convida/ativa 3–10 estabelecimentos) | **Sim**, mesmo com meios de pagamento ainda em ajuste |
| **Aquisição aberta** (anúncio / self-serve sem filtro) | **Não**, até Stripe/PIX E2E + monitoramento de erros |

Enquanto a cobrança não está redonda: use **override de plano** em `/platform` (RF-027) e cobre por fora (PIX/transferência) se necessário.

---

## Checklist por estabelecimento piloto

Antes de liberar o painel ao dono:

1. [ ] Domínio e App Check OK na Vercel (site key + domínios `waitless.solutions` / `www`)
2. [ ] Dono cria conta / completa onboarding
3. [ ] Pedir **2FA** em `/admin/security` (recomendado)
4. [ ] Plano liberado: checkout Stripe **ou** override em `/platform`
5. [ ] Combinar canal de suporte: **chat** em `/admin/help` (Dono/Admin) ↔ `/platform/support`; e-mail detalhado como secundário. Assinatura/PIX pode mudar.
6. [ ] Agendamento: só ligar em Configurações se for usar
7. [ ] Smoke: adicionar cliente na fila → abrir `/q/{token}` → atualização ao vivo
8. [ ] (Opcional) Enviar link público `/agendar/{companyId}` e marcar um horário de teste

Script útil de cobrança (quando for validar Stripe): `npm run verify:stripe`.
PIX Asaas: `npm run verify:asaas` e `npm run setup:asaas-pix`. Para a UI mostrar PIX, `NEXT_PUBLIC_BILLING_PIX_ENABLED=true` (e API key + webhook no servidor).

---

## Fase 0 — 0 a 10 tenants (agora)

**Foco:** operação assistida + cobrança.

- Onboarding assistido (você ativa)
- Override `/platform` como rede de segurança
- Fechar Stripe live (webhook + `STRIPE_PRICE_*`) e/ou Asaas (sair de sandbox se for cobrar PIX)
- Validar: `npm run verify:stripe` e `npm run verify:asaas` no ambiente (local / Vercel env)
- Infra atual (Vercel + Firebase Blaze) basta

---

## Fase 1 — 10 a 50 tenants

**Foco:** ver falhas antes do cliente reclamar.

| Item | Como no Waitless |
|------|------------------|
| Erros (Sentry) | Conta **free** em [sentry.io](https://sentry.io) → projeto Next.js → copie o DSN → `SENTRY_DSN` na Vercel (opcional `SENTRY_ENVIRONMENT=production`). O helper [`src/lib/observability/report-error.ts`](../src/lib/observability/report-error.ts) envia eventos server-side quando configurado. Free tier basta no piloto. |
| LOG interno (plataforma) | `/platform/logs` (RF-037): erros e eventos operacionais dos assinantes em `tenantRouteEvents` — complementar ao Sentry, sem embutir a UI externa |
| Rate limit compartilhado | Conta **free** em [upstash.com](https://upstash.com) → Redis REST → `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` na Vercel. Sem essas vars, o limitador usa memória (dev/single-instance). Ver [`src/lib/rate-limit/`](../src/lib/rate-limit/). Zero custo no free tier. |
| CSP enforce | Após checklist em [`CSP_ENFORCEMENT_CHECKLIST.md`](./CSP_ENFORCEMENT_CHECKLIST.md): `CSP_REPORT_ONLY=false` na Vercel + redeploy |
| Backup Firestore | **Manual** (sem agendamento pago GCS neste momento). Ver secção **Backup** abaixo; testar restore 1× |
| Alertas billing | Monitorar falhas de webhook Stripe/Asaas (logs Vercel + Sentry + `/platform/logs`) |
| Chat de suporte | `/platform/support` ↔ `/admin/help` (RF-036); e-mail detalhado como secundário |

### Setup rápido — Sentry free

1. Criar conta/projeto em sentry.io (plano Developer / free)
2. Vercel → Project → Settings → Environment Variables → `SENTRY_DSN=https://...@....ingest.sentry.io/...`
3. Redeploy; forçar um erro de API e confirmar evento no Sentry

### Setup rápido — Upstash Redis free

1. Criar database Redis (região próxima à Vercel) no console Upstash
2. Copiar REST URL e TOKEN
3. Vercel: `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`
4. Redeploy; rate limits de agendamento/público passam a ser compartilhados entre instâncias

### Backup Firestore (runbook manual — sem custo de scheduler)

Não automatizar export agendado para GCS neste momento (storage/custo). Faça sob demanda:

1. Google Cloud Console → projeto Firebase → **Firestore** → Import/Export **ou**
2. `gcloud firestore export gs://SEU_BUCKET/backups/$(date +%Y%m%d) --project=SEU_PROJECT` (só quando precisar; o bucket tem custo de armazenamento)
3. **Teste de restore** em projeto de staging pelo menos uma vez por trimestre
4. Registrar DPA com Google Cloud / Vercel / Stripe / Asaas (LGPD)

---

## Fase 2 — 50 a 200 tenants

**Foco:** custo Blaze e contenção.

- Métricas de leituras: listeners admin (~2) + 1 `publicQueue` por cliente na fila — usar console Firebase Usage
- Logs com `companyId` via [`tenant-log.ts`](../src/lib/observability/tenant-log.ts) para filtrar “noisy neighbors”
- Rate limit por tenant (`companyId` na chave) nas APIs públicas de agendamento (já suportado pelo helper)
- WhatsApp Business API: só Pro, com retry/fila se volume crescer
- Budgets Vercel Functions; runbook: suspender tenant, App Check incidente, reemitir cobrança

### Runbook rápido — suspender tenant

1. `/platform` → empresa → status **suspended** / **paused**
2. Confirmar que fila operacional bloqueia e Conta permanece acessível
3. Avisar o dono pelo canal de suporte

### Runbook — incidente App Check

1. Verificar site key e domínios no Google Cloud / Firebase
2. Confirmar `NEXT_PUBLIC_FIREBASE_APP_CHECK_RECAPTCHA_SITE_KEY` na Vercel Production
3. Redeploy; testar login + listener da fila

---

## Fase 3 — 200+ tenants

**Foco:** multi-tenant pesado.

- Traces/APM + quotas por `companyId`
- Avaliar proxy/região Firestore se latência/adblock piorar
- Filas assíncronas para jobs pesados (tolerância/sync)
- Revisar limites em `src/lib/billing/plans.ts` e `plan-limits.ts` com uso real

---

## Ordem prática

1. Aceitar 3–10 pilotos (pagamento manual ou Stripe parcial + override)
2. Em paralelo: configurar **Sentry free** + **Upstash free** (acima); backup Firestore só manual sob demanda
3. Antes de anunciar: Stripe/PIX E2E + `CSP_REPORT_ONLY=false`
4. Com tração: otimizar leituras/écritas e WhatsApp API

## Fora de escopo imediato

Reescrita de arquitetura, multi-região ativa, app mobile nativo, backup Firestore agendado (custo de storage).
