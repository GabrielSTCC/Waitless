# Waitless — Arquitetura

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilo | Tailwind CSS v4, tokens Waitless (Navy + Laranja), next-themes |
| Animações | Framer Motion |
| Backend | Firebase Firestore |
| Auth | Firebase Auth (e-mail/senha + Google) |
| Hosting | Vercel (app) + Firebase (Firestore/Auth/Rules) |

**Projeto Firebase:** `waitless-queue-saas`

## Setup local

1. `npm install && npm run dev`
2. Firebase Console → **Authentication → Sign-in method** → habilitar **E-mail/senha** e **Google**.
3. Acessar `/admin/signup` para criar o primeiro estabelecimento (owner + company + member).
4. Deploy de rules: `npx firebase-tools@latest deploy --only firestore:rules,firestore:indexes`

## Modelo de dados (Firestore)

```
members/{userId}
  companyId, email, role: "owner" | "staff"

companies/{companyId}
  name, ownerId, avgServiceTimeMin, brand?, createdAt
  // brand: { accentColor?, logoUrl?, tagline? }

publicQueue/{token}
  companyId, entryId, status, position, estimatedWaitMin
  companyName, companyTagline?, avgServiceTimeMin
  brandAccent?, brandLogoUrl?, updatedAt
  // Leitura pública anônima; escrita pelo staff do tenant

companies/{companyId}/clients/{clientId}
  name, whatsapp, normalizedWhatsapp, normalizedName
  visitCount, createdAt, lastVisitAt

companies/{companyId}/queue/{entryId}
  clientId, clientName, clientWhatsapp
  status: "waiting" | "in_service" | "completed"
  position, ticketNumber, publicToken?
  createdAt, startedAt?, completedAt?
  location?, estimatedWaitMin?

companies/{companyId}/activeWaiting/{clientId}
  entryId, createdAt
  // Índice de unicidade: impede cliente duplicado em waiting (v0.1.2)

companies/{companyId}/meta/queue
  lastPosition, lastTicket
  // Contadores atômicos via transaction (v0.1.2)
```

## Listeners em tempo real (Admin)

Duas queries `onSnapshot` por sessão admin:

1. `queue where status == 'waiting' orderBy position asc`
2. `queue where status == 'in_service' orderBy startedAt asc`

**Custo:** 2 listeners fixos; reads incrementais apenas em mudanças.

## Resiliência: bloqueador de anúncios (Admin)

Extensões como Brave Shields e uBlock Origin podem bloquear os canais **Listen/Write** do Firestore (`ERR_BLOCKED_BY_CLIENT` no DevTools), impedindo o Kanban de atualizar em tempo real sem aviso claro ao operador.

### Sincronia e Fallback de Conexão (Firestore)

Para mitigar o erro `ERR_BLOCKED_BY_CLIENT` causado por extensões de privacidade e navegadores baseados em Chromium com Shields ativos (ex: Brave), a inicialização do Firestore (`initializeFirestore` em `src/lib/firebase/config.ts`) foi configurada com `experimentalForceLongPolling: true`. Isso evita a dependência estrita de WebSockets (`wss://`) que são frequentemente interceptados.

**Escalação futura (fora de escopo v0.3.36):** proxy de domínio customizado via Firebase Hosting Rewrites ou Cloudflare Workers — rotear `firestore.googleapis.com` pelo domínio white-label do tenant para evitar listas de bloqueio.

### Componentes (v0.4.0)

| Peça | Arquivo |
|------|---------|
| Aviso informativo | `src/components/admin/ProtectionAdvisory.tsx` |
| Lógica de dismiss/escopo | `src/lib/admin/protection-advisory.ts` |
| Integração admin | `src/app/admin/AdminLayoutClient.tsx` |

**UI:** card flutuante no canto inferior direito; não bloqueia interação. **Entendido** persiste dismiss na sessão; **Saiba mais** expande instruções (Brave, uBlock, recarregar).

### Escopo e ambientes

- **Produção:** aviso ativo em hostname ≠ `localhost` / `127.0.0.1`.
- **Dev:** `NEXT_PUBLIC_SHOW_PROTECTION_ADVISORY=true` no `.env.local` força o aviso em localhost.
- **Rotas:** todo `/admin/*` autenticado, exceto `/admin/auth`, login, signup e onboarding.
- **Cliente `/q/[token]`:** fora de escopo — fricção zero preservada.

## Posição na fila

Atribuída via **Firestore transaction** na criação (v0.1.2):

- Documento `meta/queue` mantém `lastPosition` e `lastTicket` incrementados atomicamente.
- Documento `activeWaiting/{clientId}` garante anti-duplicata na fila de espera.
- `activeWaiting/{clientId}` é removido ao iniciar atendimento (`waiting → in_service`).

## Busca Mini-CRM

- WhatsApp: prefix query em `normalizedWhatsapp` (somente dígitos).
- Nome: prefix query em `normalizedName` (lowercase).
- Debounce 300ms no frontend.

## Listeners em tempo real (Cliente)

Uma query `onSnapshot` por sessão cliente:

1. `publicQueue/{token}` — snapshot denormalizado com posição, ETA e branding

**Custo:** 1 listener fixo por cliente; sem acesso às coleções internas do tenant.

## Sync publicQueue (Admin)

Quando a fila `waiting` muda, o dashboard chama `syncPublicQueueSnapshots` para atualizar todos os docs públicos ativos com posição e ETA corretos.

## Security Rules

- Staff autenticado com `members/{uid}.companyId` acessa apenas seu tenant.
- Cliente anônimo: leitura em `publicQueue/{token}`; escrita apenas por staff do `companyId` correspondente.
- `members` write restrito à criação pelo próprio uid (signup).

## Coleções adicionais (v0.3)

```
invites/{inviteId}
  companyId, email, role, createdBy, expiresAt, used

companies/{companyId}/meta/analytics
  totalServed, totalServedToday, avgWaitMinToday, lastUpdated

companies/{companyId}/whatsappLogs/{logId}
  to, status, sentAt (debug API)
```

## Firebase Storage

- Path: `companies/{companyId}/brand/logo.{ext}`
- Bucket: `{projectId}.firebasestorage.app` — **não** usar `{projectId}.firebaseapp.com` (authDomain)
- Rules ([`storage.rules`](../storage.rules)): write apenas pelo owner; leitura pública.
- CORS: [`cors.json`](../cors.json) + `npm run setup:storage-cors` (gcloud/gsutil)

### Setup inicial (obrigatório antes do upload)

1. Ativar plano **Blaze** e [habilitar Storage](https://console.firebase.google.com/project/waitless-queue-saas/storage) (Get started).
2. `npm run setup:firebase-storage` — cria bucket (se possível), publica rules e aplica CORS.

## Cloud Functions

| Função | Trigger |
|--------|---------|
| `onMemberCreated` | `members/{uid}` onCreate → custom claims |
| `cleanupPublicQueue` | schedule 24h → delete completed > 24h |
| `whatsappWebhook` | HTTPS → eventos Meta |

## Integrações

| Integração | Status |
|------------|--------|
| WhatsApp wa.me | v0.3 |
| WhatsApp Business API | v0.3 (env opcional) |
| Extração automática de cores da logo | v0.3 |
| White-label (cor + tagline + logo URL/upload) | v0.2+ |
| Cloud Functions (custom claims + cleanup) | v0.3 |
| Multi-staff (invites) | v0.3 |
| Analytics operacional | v0.3 |

## Fases

| Fase | Escopo |
|------|--------|
| v0.1 | Admin + fila + Mini-CRM + realtime |
| v0.2 | Link público `/q/[token]` + white-label |
| v0.3 | WhatsApp + multi-staff + analytics + Storage + Functions |
