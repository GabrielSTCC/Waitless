# Waitless ? Requisitos Funcionais

## RF-001 ? Autentica??o admin
Staff autentica via e-mail/senha ou Google em `/admin/auth`.

## RF-002 ? Cadastro de estabelecimento
Owner cria company + member em signup ou onboarding Google.

## RF-003 ? Fila em tempo real
Kanban Aguardando / Em Atendimento com listeners Firestore e badge Ao Vivo.

## RF-004 ? Mini-CRM
Busca por WhatsApp/nome com debounce 300ms; modal Add Customer; anti-duplicata na fila.

## RF-005 ? Link p?blico do cliente
Tela `/q/{token}` com posi??o, ETA, branding white-label e listener `publicQueue`.

## RF-006 ? White-label
Settings: tagline, cor de destaque (WCAG 4.5:1), logo por URL ou upload Storage.

## RF-007 ? P?gina Clientes
Listagem de clientes por `lastVisitAt` com a??o Entrar na fila.

## RF-008 ? Estado conclu?do
Ao finalizar atendimento, cliente v? "Atendimento conclu?do" antes do cleanup.

## RF-009 ? WhatsApp wa.me
Bot?o no card Aguardando abre wa.me com mensagem e link da fila.

## RF-010 ? Multi-staff
Dono convida membros por e-mail em `/admin/invite/{id}` com papel Admin ou Base.

## RF-011 ? Analytics
M?tricas em `/admin/analytics`: atendimentos hoje, tempo m?dio, fila atual.

## RF-012 ? Extra??o de cor da logo
API sugere cor de destaque a partir da logo enviada.

## RF-013 ? WhatsApp Business API
Rotas `/api/whatsapp/send` e `/api/whatsapp/webhook` quando credenciais Meta configuradas.

## RF-014 ? Cloud Functions
Custom claims em cria??o de member; cleanup di?rio de `publicQueue` completed.

## RF-015 ? Acessibilidade motion
`prefers-reduced-motion` respeitado globalmente e em componentes animados.

## RF-016 ? Hierarquia de pap?is
Tr?s pap?is: **Dono** (controle total e gest?o de equipe), **Admin** (fila, clientes, analytics e configura??es) e **Base** (fila, clientes e cadastro). Permiss?es centralizadas em `src/lib/permissions.ts`, regras Firestore/Storage alinhadas, sidebar e rotas restritas por papel. Dono pode convidar, remover e alterar papel (Admin ? Base).

## RF-018 ? Acessibilidade e internacionaliza??o
P?gina `/admin/accessibility` com tema, anima??es, escala de texto e idioma. i18n pt-BR/en em todo o app. Dono define `defaultLocale` da empresa (Firestore); equipe vinculada usa override tempor?rio em `sessionStorage` (limpo no logout). ?cone de idioma no login e header mobile. Cliente `/q/{token}` usa `publicQueue.locale`.

## RF-017 ? Tempo de toler?ncia na fila
Dono e Admin configuram em Configura??es se h? tempo de toler?ncia (`toleranceEnabled`) e quantos minutos (`toleranceMin`, 1?30). Quando ativo e o cliente ? o **pr?ximo da fila** (posi??o de exibi??o 1), inicia contagem com `turnStartedAt` / `toleranceExpiresAt`. O cliente v? countdown em `/q/{token}`; ao expirar sem atendimento, o sistema remove automaticamente a entrada (`status: expired` no link p?blico), libera o lugar e inicia toler?ncia para o pr?ximo. Enforcement via Cloud Function agendada (`enforceQueueTolerance`, a cada 1 min) e fallback no painel admin (`useToleranceEnforcement`). Posi??o exibida reflete ordem real ap?s remo??es (`displayPosition` via `queue-rank`).

## RF-019 ? P?gina da Conta (Dono)
Rota `/admin/account` vis?vel e acess?vel **somente ao Dono** (`user.uid === company.ownerId`), com guard `OwnerRouteGuard` e item na sidebar filtrado por `canAccessOwnerRoute`. Tr?s se??es: **Assinatura** (stub com `CompanySubscription` e plano "Gratuito"), **Pagamento** (stub sem Stripe) e **Excluir estabelecimento** (zona de perigo). A exclus?o exibe na p?gina a lista completa do impacto (fila, clientes, equipe, contas de login, links p?blicos, marca, assinatura); com plano pago ativo (`active`/`trialing`/`past_due` + plano essential/pro) exige confirma??o adicional sobre aus?ncia de reembolso. O Dono confirma em modal digitando o nome exato do estabelecimento e marcando checkbox de ci?ncia; ent?o `POST /api/account/delete` (Admin SDK) ou callable `deleteCompanyAccount` remove em cascata: subcole??es da empresa (incluindo `clients/*/visits`), membros, convites, `publicQueue`, `members/*/trustedDevices`, `authSecurity` por e-mail, logo no Storage e documento da empresa; cancela assinatura Stripe/Asaas quando aplic?vel; **deleta usu?rios Firebase Auth do dono e de toda a equipe** (liberando e-mails para novo cadastro). **Preserva** apenas `billingTransactions` (hist?rico de compras / auditoria financeira). Ap?s sucesso, cliente faz `logout()` e redireciona para `/admin/auth`.

## RF-020 ? Seguran?a da conta (senha)
Rota `/admin/security` acess?vel a **Dono, Admin e Base**, com item na sidebar. Exibe e-mail e m?todos de login vinculados (Google e/ou senha). Usu?rios com provedor `password` alteram senha ap?s reautentica??o com senha atual (`reauthenticateWithCredential` + `updatePassword`). Usu?rios somente Google (sem `password` em `providerData`) podem **adicionar senha** via `linkWithCredential`, habilitando login por e-mail e senha no mesmo e-mail. Pol?tica de senha centralizada em `password-policy.ts`: m?nimo **8 caracteres**, mai?scula, min?scula, n?mero e caractere especial; checklist visual em signup, convite e formul?rio de senha; i18n pt-BR/en no namespace `security`.

## RF-023 ? Verifica??o em duas etapas (e-mail)
Opcional em `/admin/security`. Quando habilitada (`members.security.twoFactorEnabled`), login por e-mail/senha pode exigir c?digo de **4 d?gitos** enviado por e-mail (Resend ou log em dev). Gatilhos: **aparelho n?o confi?vel** (fingerprint em `trustedDevices`, validade 90 dias, op??o ?confiar neste aparelho?) ou **2 erros de senha** (`authSecurity` + `requireTwoFactorOnNextLogin`). Fluxo de login: ap?s `signInWithEmailAndPassword`, `POST /api/auth/2fa/evaluate`; se necess?rio, tela `/admin/auth/verify-2fa` bloqueia o painel at? `POST /api/auth/2fa/verify`. **Habilitar** exige reautentica??o (senha ou Google), envio de OTP (`POST /api/auth/2fa/enable` fase 1) e confirma??o do c?digo (fase 2), com op??o de registrar o aparelho atual como confi?vel; **desabilitar** exige reautentica??o e revoga todos os aparelhos confi?veis. Cole??es server-only: `otpChallenges`, `authSecurity`; subcole??o `members/{uid}/trustedDevices`. SMS reservado para fase futura.

## RF-021 ? Dados legais da empresa (CNPJ)
Na p?gina `/admin/account` (somente Dono), se??o **Dados da empresa** com CNPJ (m?scara, valida??o de d?gitos verificadores, armazenado normalizado em `companies/{id}.legal.cnpj`) e raz?o social (`legal.legalName`). Persist?ncia via `updateCompany`; regras Firestore permitem alterar `legal` apenas ao criador da conta (`isCompanyCreator`). Dados n?o s?o exibidos na fila p?blica do cliente; servem ? identifica??o do respons?vel pelo tratamento de dados dos clientes (LGPD).

## RF-024 ? Conformidade LGPD (Fase A)
P?ginas p?blicas `/privacidade`, `/termos`, `/cookies` e `/canal-lgpd` com conte?do bil?ngue (pt-BR/en) derivado de `src/lib/legal/`. Controlador/Operador da plataforma configurado via `NEXT_PUBLIC_LEGAL_*` em `src/lib/legal/config.ts`. Rodap? com links legais e identifica??o por CPF. Banner de cookies com Aceitar / Rejeitar / Personalizar. Headers de seguran?a. Documenta??o: `docs/AUDITORIA_LGPD.md`, `docs/ROPA.md`, `docs/LGPD_ART18_PROCEDURE.md`.

## RF-022 ? ?cones de informa??o nas configura??es
Componente reutiliz?vel `InfoTip` (?cone i + popup ao clicar, fecha com Escape ou clique fora) integrado em `SettingsField`, `SettingsSection` e `SettingsLabel`. Aplicado nas p?ginas `/admin/settings`, `/admin/accessibility`, `/admin/account` e `/admin/security` para explicar configura??es importantes. Textos explicativos no namespace `info.*` de cada m?dulo i18n (pt-BR/en).

## RF-025 ? Realoca??o de vaga na fila
Quando o 1? da fila n?o comparece (toler?ncia expirada ou a??o manual **N?o compareceu**), ou quando o 1? desmarca (RF-026), abre-se `companies/{id}/meta/vacancy`. O sistema oferece sequencialmente a vaga aos pr?ximos da fila digital via popup em `/q/{token}` (`spotOffer`). Aceite promove o cliente a 1? com toler?ncia (RF-017); recusa mant?m a posi??o e tenta o pr?ximo eleg?vel. Staff v? `VacancyPanel` no painel com **Oferecer pr?ximo**, **Colocar na vaga** (manual) e **Fechar vaga**; nos cards, **WhatsApp imprevisto** com nome da empresa. APIs p?blicas: `POST /api/queue/spot-offer/respond`. Cloud Function `enforceQueueTolerance` abre vaga server-side; `syncPublicQueueSnapshots` n?o inicia toler?ncia no 1? enquanto vaga ativa.

## RF-026 ? Desmarca??o pelo cliente
Na tela `/q/{token}` (status `waiting`), bot?o **Desmarcar** com confirma??o. Ap?s confirmar (`POST /api/queue/withdraw`), card opcional para avisar a empresa por WhatsApp (`companyContactWhatsapp` em Configura??es). Card final **Voc? saiu da fila** (`status: cancelled`) com bot?o WhatsApp para explicar motivo depois. Se era 1? ou tinha oferta pendente, dispara RF-025. Mensagem WhatsApp cliente?empresa via `buildWithdrawWhatsAppMessage`.

## RF-027 ? Painel administrativo da plataforma
?rea `/platform` separada do painel do estabelecimento (`/admin`), acess?vel **somente** ao e-mail definido em `PLATFORM_ADMIN_EMAIL` com custom claim `platformAdmin`. Login exige senha + OTP por e-mail (exceto aparelho confi?vel por 90 dias). Sess?o httpOnly assinada (`PLATFORM_SESSION_SECRET`) e middleware server-side. Alertas por e-mail em todo login ou tentativa falha. Dashboard com KPIs globais, gest?o de empresas (suspender, pausar, excluir, sync Stripe, **alterar plano/status da assinatura** via override Firestore sem sync de pagamento), bloqueio operacional do tenant com acesso ? Conta, e auditoria em `platformAudit`.

## RF-028 ? Abas na tela do cliente
Tela `/q/{token}` com navega??o por abas **Filas**, **Hist?rico** e **Perfil** (mobile-first, sem login). Aba Filas consolida acompanhamento ao vivo existente; modais cr?ticos (vaga, desmarca??o) permanecem globais. Hist?rico lista at? 10 visitas terminais (`completed`, `cancelled`, `expired`) via `POST /api/queue/client-history`, com persist?ncia em `companies/{id}/clients/{clientId}/visits/{entryId}` escrita server-side em eventos terminais. Perfil exibe nome, WhatsApp mascarado e estabelecimento via `POST /api/queue/client-profile`; idioma pt-BR/en ajust?vel na sess?o (`sessionStorage`). URL suporta `?tab=queue|history|profile`.

## RF-030 — Orçamento e ledger de transações (plataforma)
Coleção server-only `billingTransactions/{provider}:{externalId}` alimentada por webhooks Stripe (`invoice.*`, `charge.refunded`) e Asaas (PIX), com script `npm run backfill:billing-transactions` para histórico inicial. Tela `/platform/finance` (admin plataforma) lista todas as transações com KPIs (receita paga no mês, pendentes, falhas), filtros por empresa/provedor/status/período e paginação via `GET /api/platform/transactions`. Link "Ver transações" na aba Assinatura do detalhe da empresa.

## RF-029 — Aviso de proteção do navegador no admin

Em `/admin/*` (exceto auth, login, signup e onboarding), usuário autenticado:

- **Aviso flutuante informativo** (`ProtectionAdvisory`) recomenda desativar Shields/adblock para waitless.solutions — **sem detecção automática** e **sem bloquear** o painel.
- Botões: **Entendido** (dispensa na sessão via `sessionStorage`) e **Saiba mais** (expande detalhes no mesmo card).
- Visível em produção; em localhost use `NEXT_PUBLIC_SHOW_PROTECTION_ADVISORY=true` para testar.

**Mitigação Firestore:** `initializeFirestore` com `experimentalForceLongPolling: true` evita dependência de WebSockets (`wss://`) bloqueados por adblockers.

---

## Hist?rico de Vers?o

| Data | Vers?o | Altera??es |
|------|--------|------------|
| 2026-06-25 | 0.4.3 | RF-019 exclusão completa: Auth dono+equipe, visits, trustedDevices, authSecurity; mantém billingTransactions |
| 2026-06-19 | 0.4.2 | RF-030: ledger billingTransactions + tela /platform/finance |
| 2026-06-19 | 0.4.1 | RF-027: admin da plataforma pode alterar plano/status de assinatura (override Firestore) |
| 2026-06-18 | 0.4.0 | RF-029 simplificado: aviso flutuante sem detecção; removidos probes, modal bloqueante e instrumentação |
| 2026-06-18 | 0.3.44 | RF-029 latch clear antes do SDK; retries estendidos; relatch se SDK falhar |
| 2026-06-18 | 0.3.43 | RF-029 SDK obrigatório no confirm; anti falso positivo Shields ON |
| 2026-06-18 | 0.3.39 | RF-029 anti-bypass: recoveryInFlight, clear silencioso, Google img, sinal vivo transporte |
| 2026-06-18 | 0.3.38 | RF-029 recovery full probe; monitor BAB invalida recovery; modal não fecha por flags |
| 2026-06-19 | 0.3.37 | RF-029 gate event-driven; recovery canal Firestore; IntegrityBanner lazy mount |
| 2026-06-19 | 0.3.36 | RF-029 long-polling Firestore; IntegrityBanner + adblock-detect-react; modal so transporte |
| 2026-06-19 | 0.3.35 | RF-029 retry explicito; modal nao reabre pos-pass; bloqueio live reabre |
| 2026-06-19 | 0.3.34 | RF-029 recovery ignora latch stale; google script primario; DOM bait fix |
| 2026-06-19 | 0.3.33 | RF-029 google bait fetch no-cors; falso positivo CORS recovery |
| 2026-06-19 | 0.3.32 | RF-029 recovery check ativo; DOM bait + Google multi-sinal; latch apos pass |
| 2026-06-19 | 0.3.31 | RF-029 probe extensao BlockAdBlock+Google; check 3s; retry extensao+transporte |
| 2026-06-19 | 0.3.30 | RF-029 deteccao reativa; modal so apos erro transporte; probes so no retry |
| 2026-06-19 | 0.3.29 | RF-029 BlockAdBlock substitui probes genericos; Firestore + latch mantidos |
| 2026-06-19 | 0.3.28 | RF-029 recovery pos-adblock: clear latch + re-verificacao transporte; client ready best-effort |
| 2026-06-19 | 0.3.27 | RF-029 retry exige Firestore client ready; modal nao some com adblock ativo |
| 2026-06-19 | 0.3.26 | Logs sem PII; recovery App Check; useClients permission-denied |
| 2026-06-19 | 0.3.25 | RF-029 modal sem auto-hide; dismiss so no load clear ou retry manual |
| 2026-06-19 | 0.3.24 | RF-029 modal flutuante bloqueante no lugar do banner sticky |
| 2026-06-19 | 0.3.23 | RF-029 monitoramento continuo transporte; auto-hide; retry sem reload |
| 2026-06-19 | 0.3.22 | RF-029 Google bait no-cors; Performance API sem re-latch; banner via health |
| 2026-06-19 | 0.3.21 | RF-029 recovery por probes only; auto-clear quando adblock desativado |
| 2026-06-19 | 0.3.20 | RF-029 monitoracao admin sem companyId; fallback global; notify React
| 2026-06-19 | 0.3.19 | RF-029 latch sticky transporte; sem auto-clear; recovery expl?cito
| 2026-06-18 | 0.3.17 | RF-029 refeito: token + Google bait + Firestore channel; banner only |
| 2026-06-18 | 0.3.16 | RF-029 revisado: probes XHR cors, banner inteligente, modos strict/advisory |
| 2026-06-18 | 0.3.15 | RF-029 detec??o de bloqueador no admin; modal bloqueante; gate em `/admin/*` |
| 2026-06-19 | 0.3.14 | RF-028 abas Filas/Hist?rico/Perfil em `/q/{token}`; visit log; APIs client-history e client-profile |
| 2026-06-16 | 0.3.13 | RF-027 acesso seguro /platform: e-mail ?nico, OTP obrigat?rio, sess?o httpOnly, alertas |
| 2026-06-16 | 0.3.12 | RF-027 painel administrativo da plataforma (`/platform`) |
| 2026-06-11 | 0.3.11 | RF-023 habilita??o 2FA com confirma??o OTP e registro de aparelho confi?vel |
| 2026-06-09 | 0.3.10 | RF-025 realoca??o de vaga; RF-026 desmarca??o cliente; WhatsApp contato em Settings |
| 2026-06-12 | 0.3.10 | RF-024 identifica??o legal PF do controlador (Gabriel Santos Teixeira, CPF, DPO) |
| 2026-06-12 | 0.3.9 | RF-024 conformidade LGPD Fase A: p?ginas legais, banner cookies, rodap?, auditoria |
| 2026-06-11 | 0.3.8 | RF-020 pol?tica de senha forte; RF-023 2FA opcional por e-mail com aparelhos confi?veis |
| 2026-06-09 | 0.3.7 | RF-022 InfoTip nas configura??es do admin; popups explicativos i18n |
| 2026-06-09 | 0.3.6 | RF-021 CNPJ e raz?o social na Conta do Dono; valida??o e regra Firestore owner-only |
| 2026-06-09 | 0.3.5 | RF-020 p?gina Seguran?a; alterar senha; adicionar senha para contas Google |
| 2026-06-09 | 0.3.4 | RF-019 p?gina Conta do Dono; stubs assinatura/pagamento; exclus?o em cascata com confirma??o em duas etapas |
| 2026-06-09 | 0.3.3 | RF-018 p?gina Acessibilidade; i18n pt-BR/en; idioma base do Dono; prefer?ncias visuais |
| 2026-06-09 | 0.3.2 | RF-017 tempo de toler?ncia configur?vel; remo??o autom?tica; countdown cliente |
| 2026-06-10 | 0.3.1 | RF-016 hierarquia Dono/Admin/Base; gest?o de equipe; convite com papel |
| 2026-06-09 | 0.3.0 | RF-007 a RF-015; favicon; AdminShell; Storage; Functions |
| 2026-06-09 | 0.2.0 | RF-005, RF-006; link p?blico e white-label |
| 2026-06-08 | 0.1.0 | RF-001 a RF-004; MVP admin + fila + Mini-CRM |
