# Tasks: Abas na Tela do Cliente (Filas / Histórico / Perfil)

**Input**: Design documents from `/specs/001-client-tabs/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/client-session-api.md

**Tests**: Manual validation via `quickstart.md` (no automated test suite requested)

**Constitution**: Feature touches public queue, i18n/a11y, LGPD, Security Rules — verification included in Phase 6.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tipos, utilitários e i18n base antes de backend e UI.

- [x] T001 Create `ClientVisit` types and `TerminalVisitStatus` in `src/lib/client/visit-log.ts`
- [x] T002 [P] Add `maskWhatsappDisplay()` helper in `src/lib/utils/format.ts`
- [x] T003 [P] Add `client.tabs.*`, `client.history.*`, `client.profile.*` keys in `src/lib/i18n/messages/pt-BR.ts` and `src/lib/i18n/messages/en.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Visit log, `clientId` em `publicQueue`, rules — MUST complete before user stories.

**⚠️ CRITICAL**: US2 (Histórico) depende desta fase; US1 pode iniciar UI em paralelo após T013, mas histórico real só após T006–T012.

- [x] T004 Add `clientId` field to `buildPublicQueuePayload()` in `src/lib/firebase/firestore.ts`
- [x] T005 [P] Mirror `clientId` in server payload builder in `src/lib/queue/queue-mutations-server.ts`
- [x] T006 Add `clientId` to `PublicQueueSnapshot` in `src/lib/types/index.ts` and `mapPublicQueueSnapshot()` in `src/lib/firebase/mappers.ts`
- [x] T007 Implement `appendClientVisit()` and `listClientVisits()` in `src/lib/firebase/client-visits-server.ts`
- [x] T008 Call `appendClientVisit({ status: "completed" })` in client `updateQueueStatus()` path in `src/lib/firebase/firestore.ts`
- [x] T009 Call `appendClientVisit({ status: "completed" })` in server queue completion path in `src/lib/queue/queue-mutations-server.ts`
- [x] T010 Call `appendClientVisit({ status: "cancelled" })` in `withdrawFromQueueServer()` in `src/lib/firebase/vacancy-server.ts`
- [x] T011 Call `appendClientVisit()` for `expired`/`cancelled` in `removeEntryAndOpenVacancyServer()` in `src/lib/firebase/vacancy-server.ts`
- [x] T012 Call `appendClientVisit({ status: "expired" })` in tolerance enforcement path in `functions/src/index.ts`
- [x] T013 Add deny-all rules for `companies/{companyId}/clients/{clientId}/visits/{visitId}` in `firestore.rules`

**Checkpoint**: Visit log writes on all terminal transitions; rules deployed.

---

## Phase 3: User Story 1 — Aba Filas (Priority: P1) 🎯 MVP

**Goal**: Tab shell com aba Filas contendo fluxo atual de fila ao vivo, sem regressão.

**Independent Test**: Abrir `/q/{token}` → aba Filas default → posição, ETA, tolerância, desmarcação e modais funcionam (VS-1, VS-6).

- [x] T014 [P] [US1] Create accessible `ClientTabBar` (`role="tablist"`, keyboard nav) in `src/components/client/ClientTabBar.tsx`
- [x] T015 [US1] Extract existing queue UI into `ClientQueueTab` in `src/components/client/ClientQueueTab.tsx`
- [x] T016 [US1] Refactor `src/app/q/[token]/page.tsx` as tab shell: keep `usePublicQueue`, modals (`SpotOfferModal`, `WithdrawConfirmModal`) at page level
- [x] T017 [US1] Sync active tab with URL `?tab=queue|history|profile` (default `queue`) in `src/app/q/[token]/page.tsx`
- [x] T018 [US1] Keep `ClientHeader`, `ClientLivePill`, `ClientPrivacyFooter` visible across all tabs in `src/app/q/[token]/page.tsx`

**Checkpoint**: MVP deployable — aba Filas only is fully functional with tab bar visible.

---

## Phase 4: User Story 2 — Aba Histórico (Priority: P2)

**Goal**: Listar até 10 visitas anteriores do cliente no estabelecimento, lazy-loaded.

**Independent Test**: Cliente recorrente abre Histórico e vê visitas passadas; visita ativa não duplicada (VS-3, VS-4, VS-7).

- [x] T019 [US2] Implement `POST` handler in `src/app/api/queue/client-history/route.ts` per `specs/001-client-tabs/contracts/client-session-api.md`
- [x] T020 [US2] Create `useClientHistory(token)` hook with lazy fetch in `src/lib/hooks/useClientHistory.ts`
- [x] T021 [P] [US2] Create `ClientHistoryTab` with visit list, status labels, empty state in `src/components/client/ClientHistoryTab.tsx`
- [x] T022 [US2] Wire History tab panel and fetch-on-first-open in `src/app/q/[token]/page.tsx`

**Checkpoint**: Histórico funcional para clientes com visit log populado.

---

## Phase 5: User Story 3 — Aba Perfil (Priority: P3)

**Goal**: Exibir nome, WhatsApp mascarado e seletor de idioma (sessão).

**Independent Test**: Perfil mostra dados corretos; troca pt-BR/en reflete nas abas (VS-5).

- [x] T023 [US3] Implement `POST` handler in `src/app/api/queue/client-profile/route.ts` per `specs/001-client-tabs/contracts/client-session-api.md`
- [x] T024 [US3] Create `useClientLocale(defaultLocale)` hook using `setSessionLocale()` in `src/lib/hooks/useClientLocale.ts`
- [x] T025 [P] [US3] Create `ClientProfileTab` with read-only fields and language picker in `src/components/client/ClientProfileTab.tsx`
- [x] T026 [US3] Wire Profile tab and propagate effective locale to all tab components in `src/app/q/[token]/page.tsx`

**Checkpoint**: Três abas completas; idioma persiste na sessão.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, docs, validação constitution.

- [x] T027 Hide tab bar and show invalid-link UI only when snapshot is null in `src/app/q/[token]/page.tsx`
- [x] T028 Ensure tab transitions respect `useReducedMotion()` in `src/components/client/ClientTabBar.tsx`
- [x] T029 [P] Add RF-028 and Histórico de Versão entry in `docs/REQUIREMENTS.md`
- [x] T030 Deploy updated `firestore.rules` and smoke-test APIs with curl per `specs/001-client-tabs/quickstart.md`
- [x] T031 Run manual validation VS-1 through VS-8 from `specs/001-client-tabs/quickstart.md` and fix regressions

---

## Dependencies & Execution Order

```text
Phase 1 (T001–T003)
    ↓
Phase 2 (T004–T013) — BLOCKS US2 data; US1 UI can start after T001
    ↓
Phase 3 US1 (T014–T018) — MVP 🎯
    ↓
Phase 4 US2 (T019–T022) — requires Phase 2
    ↓
Phase 5 US3 (T023–T026) — requires Phase 3 shell
    ↓
Phase 6 (T027–T031)
```

### User Story Dependencies

| Story | Depends on | Can start after |
|-------|------------|-----------------|
| US1 Filas | Phase 1 | T001 (UI shell parallel with Phase 2 after T014) |
| US2 Histórico | Phase 2 complete | T013 |
| US3 Perfil | US1 tab shell | T018 |

---

## Parallel Opportunities

**Phase 1** — T002 and T003 in parallel after T001.

**Phase 2** — T005 parallel with T004; T008–T012 parallel after T007 (different files).

**Phase 3** — T014 parallel with T015 prep.

**Phase 4** — T021 parallel with T019 once API contract known.

**Phase 5** — T025 parallel with T023.

**Phase 6** — T029 parallel with T028.

---

## Parallel Example: User Story 2

```bash
# After T019 API route is done:
Task: "T021 ClientHistoryTab component"  # UI
Task: "T020 useClientHistory hook"       # data layer (if not blocked by T019)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2 (visit log — needed for full feature; US1 works without History API)
2. Complete Phase 3 (T014–T018)
3. **STOP and VALIDATE** — VS-1, VS-2, VS-6
4. Deploy/demo if urgent

### Incremental Delivery

1. Phase 1 + 2 → data layer ready
2. Phase 3 → Filas tab (MVP)
3. Phase 4 → Histórico
4. Phase 5 → Perfil
5. Phase 6 → polish + docs

### Suggested MVP Scope

**User Story 1 (Filas)** — 5 tasks (T014–T018) after Phase 1 minimum; Phase 2 recommended before production.

---

## Task Summary

| Phase | Tasks | Story |
|-------|-------|-------|
| Setup | T001–T003 (3) | — |
| Foundational | T004–T013 (10) | — |
| US1 Filas | T014–T018 (5) | P1 MVP |
| US2 Histórico | T019–T022 (4) | P2 |
| US3 Perfil | T023–T026 (4) | P3 |
| Polish | T027–T031 (5) | — |
| **Total** | **31** | |

**Format validation**: ✅ All tasks use `- [x] Tnnn [P?] [USn?] Description with file path`
