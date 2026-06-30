# Data Model: Abas na Tela do Cliente

**Feature**: `001-client-tabs` | **Date**: 2026-06-19

## Existing Entities (unchanged semantics)

### PublicQueueSnapshot (`publicQueue/{token}`)

Campos existentes + **novo campo**:

| Field | Type | Notes |
|-------|------|-------|
| `clientId` | string | **NEW** — UUID opaco; escrito na criação/sync; permite APIs pós-delete da entrada |

Demais campos: ver `src/lib/types/index.ts` — `PublicQueueSnapshot`.

---

## New Entity: ClientVisit

**Path**: `companies/{companyId}/clients/{clientId}/visits/{visitId}`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `visitId` | string | ✅ | Document ID (= `entryId` for idempotency) |
| `entryId` | string | ✅ | Referência à entrada original em `queue/` |
| `status` | `"completed"` \| `"cancelled"` \| `"expired"` | ✅ | Status terminal público |
| `occurredAt` | Timestamp | ✅ | Momento do encerramento |
| `companyId` | string | ✅ | Denormalizado para validação |
| `clientId` | string | ✅ | Denormalizado |

### Validation Rules

- `visitId` MUST equal `entryId` — upsert idempotente (`set` merge false)
- One visit record per queue entry (no duplicates on retry)
- Active entries (`waiting`, `in_service`) MUST NOT have a visit record
- API history MUST exclude current active `entryId` if status still active

### State Transitions (visit log writes)

```text
queue entry created → (no visit record)

waiting → in_service → (no visit record)

waiting → cancelled (withdraw) → visit{cancelled}
waiting → expired (tolerance) → visit{expired}
in_service → completed → visit{completed}
waiting → deleted without terminal public status → (handled by specific flows above)
```

---

## API View Models (not persisted)

### ClientProfileView

| Field | Type | Source |
|-------|------|--------|
| `clientName` | string | `clients/{clientId}.name` or `publicQueue.clientName` |
| `maskedWhatsapp` | string | `maskWhatsappDisplay(clients/{clientId}.whatsapp)` |
| `companyName` | string | `publicQueue.companyName` |
| `locale` | `"pt-BR"` \| `"en"` | `publicQueue.locale` |

### ClientHistoryItem

| Field | Type | Source |
|-------|------|--------|
| `visitId` | string | visit doc |
| `status` | terminal status | visit doc |
| `occurredAt` | ISO string | visit doc |
| `statusLabel` | string | i18n key resolved client-side |

---

## Relationships

```text
publicQueue/{token}
  ├── companyId → companies/{companyId}
  ├── entryId → companies/{companyId}/queue/{entryId} (may be deleted)
  └── clientId → companies/{companyId}/clients/{clientId}
                      └── visits/{entryId}
```

---

## Firestore Security Rules (addition)

```javascript
match /companies/{companyId}/clients/{clientId}/visits/{visitId} {
  allow read, write: if false; // Admin SDK only
}
```

Public clients MUST NOT read `visits` directly — only via authenticated-by-token API.

---

## UI State (client-side, not persisted)

| State | Storage | Purpose |
|-------|---------|---------|
| `activeTab` | URL `?tab=` | queue \| history \| profile |
| `localeOverride` | sessionStorage | Perfil language picker |
| `historyFetch` | React state | Lazy load on tab open |

---

## i18n Keys (new namespace `client.tabs`)

| Key | pt-BR | en |
|-----|-------|-----|
| `client.tabs.queue` | Filas | Queue |
| `client.tabs.history` | Histórico | History |
| `client.tabs.profile` | Perfil | Profile |
| `client.history.empty` | … | … |
| `client.history.status.completed` | Atendido | Served |
| `client.history.status.cancelled` | Desmarcou | Cancelled |
| `client.history.status.expired` | Não compareceu | No-show |

(Implementação preenche remainder em `pt-BR.ts` / `en.ts`.)
