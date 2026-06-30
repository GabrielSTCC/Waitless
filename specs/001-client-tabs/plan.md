# Implementation Plan: Abas na Tela do Cliente (Filas / Histórico / Perfil)

**Branch**: `001-client-tabs` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-client-tabs/spec.md`

## Summary

Introduzir navegação por abas (**Filas**, **Histórico**, **Perfil**) na tela pública
`/q/{token}`, preservando o listener em tempo real existente e extraindo o conteúdo
atual para a aba Filas. Histórico e perfil serão carregados via **API server-side**
autenticada pelo token público (sem login). Como entradas `cancelled`/`expired`
são removidas de `queue/`, o histórico persistente exige uma nova subcoleção
`visits` escrita em eventos terminais.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router), React 19

**Primary Dependencies**: Firebase Firestore (client listener + Admin SDK),
Framer Motion (animações existentes), Tailwind CSS v4, lucide-react

**Storage**: Firestore — `publicQueue/{token}` (existente) + nova subcoleção
`companies/{companyId}/clients/{clientId}/visits/{visitId}`

**Testing**: Validação manual via `quickstart.md`; sem suite automatizada de
cliente hoje — regressão visual/funcional dos fluxos de fila existentes

**Target Platform**: Web mobile-first (Vercel + Firebase)

**Project Type**: Web application (Next.js monolith)

**Performance Goals**: Aba Filas continua com 1 listener Firestore; Histórico
carregado sob demanda (lazy) ao abrir aba; API de histórico < 500 ms p95

**Constraints**: Zero login; 1 listener `publicQueue` por sessão; LGPD — WhatsApp
mascarado; i18n pt-BR/en; `prefers-reduced-motion`; WCAG 4.5:1 nas abas

**Scale/Scope**: 3 abas, 2 rotas API novas, ~8 componentes novos/refatorados,
gravação de visit log em 4–5 pontos de mutação existentes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Reference: `.specify/memory/constitution.md` (Waitless v1.0.0)

| Gate | Pass? | Notes |
|------|-------|-------|
| **I. Multi-Tenant & Real-Time** | ✅ | Listener único em `publicQueue`; histórico via Admin SDK escopado por `companyId` + `clientId` derivado do token |
| **II. Zero-Friction Client** | ✅ | Sem login; aba Filas padrão; modais globais; i18n sessionStorage |
| **III. Documentation** | ✅ | RF-028 em `docs/REQUIREMENTS.md` na implementação |
| **IV. Security & LGPD** | ✅ | Histórico/perfil somente via API validada por token; WhatsApp mascarado; subcoleção `visits` sem leitura pública direta |
| **V. Simplicity** | ✅ | Sem novas dependências; refatoração da page existente; padrão API igual a `/api/queue/withdraw` |

If any gate fails without justification, document in **Complexity Tracking** below.

## Project Structure

### Documentation (this feature)

```text
specs/001-client-tabs/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── client-session-api.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── q/[token]/
│   │   ├── layout.tsx          # optional: ClientLocaleProvider wrapper
│   │   └── page.tsx            # tab shell + modals (refatorado)
│   └── api/queue/
│       ├── client-history/route.ts   # NEW
│       └── client-profile/route.ts   # NEW
├── components/client/
│   ├── ClientTabBar.tsx              # NEW
│   ├── ClientQueueTab.tsx            # NEW (extraído de page.tsx)
│   ├── ClientHistoryTab.tsx          # NEW
│   ├── ClientProfileTab.tsx          # NEW
│   └── ... (componentes existentes reutilizados)
├── lib/
│   ├── client/
│   │   └── visit-log.ts              # NEW — tipos + helpers
│   ├── firebase/
│   │   └── client-visits-server.ts   # NEW — append + list
│   ├── hooks/
│   │   ├── useClientHistory.ts       # NEW
│   │   └── useClientLocale.ts        # NEW — override sessionStorage
│   └── utils/
│       └── format.ts                 # + maskWhatsappDisplay()
functions/src/
└── index.ts                          # visit log on tolerance expire (se necessário)
firestore.rules                       # deny public read on visits subcollection
docs/REQUIREMENTS.md                  # + RF-028
```

**Structure Decision**: Monolith Next.js existente; APIs em `src/app/api/queue/`
seguindo padrão de `withdraw/route.ts`; componentes cliente em
`src/components/client/`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nova subcoleção `visits` | Histórico de `cancelled`/`expired` | Query em `queue/` — entradas são **deletadas** em withdraw/tolerância; só `completed` permanece brevemente |
| Duas rotas API | Lazy load Histórico vs Perfil | Incluir tudo no listener Firestore — expõe PII e viola rules |

## Phase 0 Output

See [research.md](./research.md) — all technical unknowns resolved.

## Phase 1 Output

- [data-model.md](./data-model.md)
- [contracts/client-session-api.md](./contracts/client-session-api.md)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Re-Check

| Gate | Pass? | Notes |
|------|-------|-------|
| **I** | ✅ | Design mantém 1 listener; visit log writes server-side only |
| **II** | ✅ | Tab bar acessível; Filas default; locale em sessionStorage |
| **III** | ✅ | RF-028 documentado no quickstart e tasks futuras |
| **IV** | ✅ | Token-scoped API; masked phone; Firestore rules deny client reads on visits |
| **V** | ✅ | Reuse existing shell/components; no new npm packages |
