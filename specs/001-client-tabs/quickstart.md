# Quickstart: Abas na Tela do Cliente

**Feature**: `001-client-tabs` | **Date**: 2026-06-19

## Prerequisites

- `npm install` && `npm run dev`
- Firebase emulators **or** project `waitless-queue-saas` configured
- Service account for Admin SDK APIs (`secrets/firebase-service-account.json` or env)
- Estabelecimento de teste com cliente na fila

## Setup

1. Start dev server:

```bash
npm run dev
```

2. No admin (`/admin`), adicione um cliente à fila e copie o link `/q/{token}`.

3. (Optional) Deploy rules after implementation:

```bash
npx firebase-tools deploy --only firestore:rules
```

---

## Validation Scenarios

### VS-1: Aba Filas (regressão)

1. Abrir link `/q/{token}` com cliente em `waiting`
2. **Expected**: Aba **Filas** ativa por padrão; posição, ETA, badge ao vivo visíveis
3. Avançar fila no admin até posição ≤ 2
4. **Expected**: Alerta de proximidade na aba Filas
5. Iniciar atendimento no admin
6. **Expected**: Status "É a sua vez" na aba Filas

**Pass criteria**: SC-002 — fluxos existentes intactos

---

### VS-2: Navegação por abas

1. Com link válido, tocar **Histórico** e **Perfil**
2. **Expected**: Conteúdo troca; header, live pill e footer permanecem
3. Recarregar página em `/q/{token}?tab=history`
4. **Expected**: Aba Histórico aberta após reload
5. Navegar por teclado (Tab + Arrow keys na tab bar)
6. **Expected**: Foco visível; `aria-selected` correto

**Pass criteria**: FR-001, SC-003 (≤ 2 toques para histórico)

---

### VS-3: Histórico com visitas anteriores

**Setup**: Mesmo cliente com 2+ visitas encerradas (completar atendimento,
readicionar à fila, desmarcar, etc.)

1. Abrir link da visita ativa
2. Ir à aba **Histórico**
3. **Expected**: Lista com datas e status legíveis; visita ativa **não** duplicada
4. Completar atendimento; revisitar Histórico
5. **Expected**: Nova entrada "Atendido" aparece

**Pass criteria**: FR-003, FR-004, SC-005 (isolamento)

---

### VS-4: Histórico vazio

1. Cliente novo (primeira visita, ainda waiting)
2. Abrir aba **Histórico**
3. **Expected**: Empty state amigável

**Pass criteria**: User Story 2 scenario 2

---

### VS-5: Perfil

1. Abrir aba **Perfil**
2. **Expected**: Nome completo, WhatsApp mascarado, nome do estabelecimento
3. Trocar idioma para English
4. **Expected**: Labels das abas e textos traduzíveis em inglês
5. Recarregar página
6. **Expected**: Idioma persiste na sessão (sessionStorage)

**Pass criteria**: FR-005, FR-006, SC-004

---

### VS-6: Modais globais

1. Cliente em posição 1 com vaga aberta — oferta pendente
2. Navegar para aba **Perfil**
3. **Expected**: Modal de oferta de vaga ainda aparece
4. Na aba Filas, clicar **Desmarcar**
5. **Expected**: Modal de confirmação funciona de qualquer aba

**Pass criteria**: FR-008

---

### VS-7: Isolamento de dados

1. Criar dois clientes distintos no mesmo estabelecimento
2. Obter tokens `/q/{tokenA}` e `/q/{tokenB}`
3. Completar visitas distintas para cada um
4. Abrir Histórico em tokenA
5. **Expected**: Apenas visitas do cliente A

**Pass criteria**: FR-010, SC-005

---

### VS-8: Link inválido

1. Abrir `/q/invalid-token-xyz`
2. **Expected**: Mensagem de link inválido; abas não exibidas

**Pass criteria**: User Story 3 scenario 3

---

## API Smoke Tests (curl)

```bash
# Profile
curl -s -X POST http://localhost:3000/api/queue/client-profile \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"YOUR_TOKEN\"}" | jq

# History
curl -s -X POST http://localhost:3000/api/queue/client-history \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"YOUR_TOKEN\"}" | jq
```

---

## Documentation Update (implementation phase)

Add **RF-028** to `docs/REQUIREMENTS.md`:

> Abas Filas / Histórico / Perfil em `/q/{token}`; histórico via visit log;
> perfil com WhatsApp mascarado e idioma de sessão.

---

## Related Artifacts

- [spec.md](./spec.md) — requirements
- [data-model.md](./data-model.md) — Firestore schema
- [contracts/client-session-api.md](./contracts/client-session-api.md) — API shapes
- [plan.md](./plan.md) — architecture decisions
