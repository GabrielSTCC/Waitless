# Research: Abas na Tela do Cliente

**Feature**: `001-client-tabs` | **Date**: 2026-06-19

## 1. Fonte de dados para Histórico

**Decision**: Subcoleção `companies/{companyId}/clients/{clientId}/visits/{visitId}` escrita server-side em eventos terminais.

**Rationale**:
- Entradas `cancelled` e `expired` **deletam** o documento em `queue/` (ver
  `withdrawFromQueueServer`, `removeEntryAndOpenVacancyServer`).
- Apenas `completed` permanece em `queue/` temporariamente; `publicQueue` é
  limpo após 24h (`cleanupPublicQueue`).
- Histórico confiável exige persistência dedicada no momento da transição terminal.

**Alternatives considered**:
| Alternativa | Motivo de rejeição |
|-------------|-------------------|
| Query `queue/` where `clientId` | Não inclui cancelled/expired (deletados) |
| localStorage no dispositivo | Não sincroniza entre dispositivos; frágil |
| Expor `clientId` no `publicQueue` + read Firestore | Viola LGPD/isolamento; rules bloqueiam leitura anônima de `queue/` |

**Write points** (append idempotente por `entryId`):
1. `updateQueueStatus` → `completed` (client + server paths)
2. `withdrawFromQueueServer` → `cancelled`
3. `removeEntryAndOpenVacancyServer` → `expired` / `cancelled`
4. Cloud Function `enforceQueueTolerance` → `expired`

**Backfill**: Script opcional one-shot importando `queue/` com `status == completed`
para clientes existentes (não bloqueia MVP).

---

## 2. Autenticação anônima via token

**Decision**: APIs `POST /api/queue/client-history` e `POST /api/queue/client-profile`
com body `{ token: string }` — mesmo padrão de `withdraw/route.ts`.

**Rationale**: Token público já é o capability bearer do cliente; Admin SDK valida
existência do doc `publicQueue/{token}` e deriva `companyId`, `entryId`, `clientId`.

**Alternatives considered**:
| Alternativa | Motivo de rejeição |
|-------------|-------------------|
| GET com token na URL | Token em logs/referrers — POST preferível |
| Firebase Auth anônimo | Adiciona fricção (viola spec FR-007) |

**Resolução de `clientId`**:
1. Ler `publicQueue/{token}` → `companyId`, `entryId`
2. Se `entryId` ainda existe em `queue/`, usar `clientId` da entrada
3. Senão, buscar visit log mais recente ou campo denormalizado `clientId` adicionado
   ao `publicQueue` **somente server-side** (opcional optimization — preferir
   lookup via entryId em visit log by entryId query)

**Fallback quando entrada deletada**: Query `visits` where `entryId == X` limit 1,
ou denormalizar `clientId` em `publicQueue` (recomendado — write-once at queue
creation in `buildPublicQueuePayload`).

---

## 3. Denormalizar `clientId` em `publicQueue`

**Decision**: Adicionar `clientId` ao payload de `publicQueue` (campo já escopado
ao token; não expõe dados de outros clientes).

**Rationale**: Após withdraw/expired, `entryId` não resolve em `queue/`; `clientId`
no doc público permite API de histórico mesmo em links terminais (completed/cancelled)
antes do cleanup de 24h.

**Privacy note**: `clientId` é UUID opaco; não é PII. WhatsApp **não** vai para
`publicQueue`.

---

## 4. UI de abas

**Decision**: Tab bar fixa abaixo do header; conteúdo com `role="tabpanel"`; URL
search param `?tab=queue|history|profile` (default `queue`).

**Rationale**:
- Deep link e refresh preservam aba
- Filas permanece default (SC-001)
- Listener `usePublicQueue` permanece no page parent — não desmonta ao trocar aba

**Alternatives considered**:
| Alternativa | Motivo de rejeição |
|-------------|-------------------|
| Rotas separadas `/q/[token]/history` | Remontaria layout; risco de perder listener |
| Bottom nav sem URL state | Refresh perde aba ativa |

**A11y**: `tablist` + `aria-selected` + foco por teclado (←/→); transições
condicionadas a `useReducedMotion()`.

---

## 5. Locale na aba Perfil

**Decision**: Hook `useClientLocale` com override em `sessionStorage`
(`waitless-locale-session` — chave existente) independente do admin `LocaleProvider`.

**Rationale**:
- Página `/q/` não usa `LocaleProvider` hoje; usa `useClientTranslations(snapshot.locale)`
- Spec FR-006 exige persistência **de sessão** — `setSessionLocale` adequado
- Cookie consent: sessionStorage é estritamente necessário para UX de idioma
  durante visita (functional, mesma sessão)

**Flow**: locale efetivo = `sessionOverride ?? snapshot.locale ?? pt-BR`

---

## 6. Mascaramento de WhatsApp

**Decision**: Função `maskWhatsappDisplay(digits)` em `format.ts` — exibe últimos
4 dígitos: `(••) •••••-1234`.

**Rationale**: Perfil obtém WhatsApp via API server-side a partir de
`clients/{clientId}`; nunca expor número completo na UI pública.

---

## 7. Índices Firestore

**Decision**: Subcoleção `visits` under client — query `orderBy occurredAt desc limit 10`
sem índice composto adicional (path já escopado).

**Rationale**: Collection group não necessária; API sempre conhece `companyId` +
`clientId` após validar token.

---

## 8. Next.js 16

**Decision**: Manter `"use client"` na page; APIs em Route Handlers `nodejs` runtime.

**Rationale**: Padrão existente em `/q/[token]/page.tsx` e `/api/queue/*`.
Consultar `node_modules/next/dist/docs/` se usar parallel routes ou intercepting
routes (não necessário para esta feature).
