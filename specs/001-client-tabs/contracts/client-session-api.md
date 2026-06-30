# API Contract: Client Session (History + Profile)

**Feature**: `001-client-tabs` | **Version**: 1.0.0 | **Date**: 2026-06-19

Both endpoints require a valid `publicQueue/{token}` document. Invalid or missing
token returns `400`. Server uses Firebase Admin SDK.

---

## POST `/api/queue/client-profile`

Returns read-only profile for the **Perfil** tab.

### Request

```json
{
  "token": "string (required, public queue token)"
}
```

### Response `200`

```json
{
  "clientName": "Maria Silva",
  "maskedWhatsapp": "(••) •••••-1234",
  "companyName": "Clínica Exemplo",
  "locale": "pt-BR"
}
```

### Errors

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "token obrigatório" }` | Missing token |
| 400 | `{ "error": "Link inválido." }` | Token not found |
| 500 | `{ "error": "..." }` | Server/credential failure |

### Privacy

- MUST NOT return full WhatsApp number
- MUST NOT return `clientId`, `companyId`, or internal IDs

---

## POST `/api/queue/client-history`

Returns up to 10 past visits for the **Histórico** tab.

### Request

```json
{
  "token": "string (required)"
}
```

### Response `200`

```json
{
  "visits": [
    {
      "visitId": "uuid-entry-id",
      "status": "completed",
      "occurredAt": "2026-06-18T14:30:00.000Z"
    },
    {
      "visitId": "uuid-entry-id-2",
      "status": "cancelled",
      "occurredAt": "2026-06-17T10:15:00.000Z"
    }
  ],
  "activeEntryId": "uuid-current-entry-or-null"
}
```

### Semantics

- `visits` sorted `occurredAt` descending, max 10
- Excludes visit where `visitId === activeEntryId` if current public status is
  `waiting` or `in_service`
- Empty array valid — client shows empty state
- `status` enum: `completed` | `cancelled` | `expired`

### Errors

Same as client-profile.

---

## Authorization Model

```text
token → publicQueue doc → companyId + clientId (+ entryId, status)
```

- No Firebase Auth required
- Token MUST be treated as secret capability (POST body, not URL logs)
- Rate limiting: defer to Vercel/Firebase defaults; optional future enhancement

---

## Client Integration

| Tab | Endpoint | When |
|-----|----------|------|
| Filas | — (Firestore listener) | Always mounted |
| Histórico | `client-history` | On first open of History tab |
| Perfil | `client-profile` | On first open of Profile tab |

Refetch history when returning to tab after terminal state change (optional polish).

---

## Server Write Contract (internal)

Function `appendClientVisit(params)` — idempotent upsert:

```typescript
interface AppendClientVisitParams {
  companyId: string;
  clientId: string;
  entryId: string;
  status: "completed" | "cancelled" | "expired";
  occurredAt?: Date; // default: now
}
```

Path: `companies/{companyId}/clients/{clientId}/visits/{entryId}`

Called from queue mutation paths — not exposed as HTTP endpoint.
