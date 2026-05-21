# API Contract: Sessions Endpoint

**Route**: `GET/DELETE /api/sessions`

**Auth**: `x-api-key` header (timing-safe comparison against `PROGRESS_API_KEY` env var)
**User scope**: `x-user-pin` header (4-6 digits)

---

## List Sessions

```
GET /api/sessions
Headers: x-api-key, x-user-pin
Query: ?cursor=<string> (optional, for pagination)
```

**Response 200**:
```json
{
  "sessions": [
    { "id": "uuid", "url": "https://...blob-url...", "uploadedAt": "2026-05-20T15:53:40Z" }
  ],
  "cursor": "next-page-cursor-or-null",
  "hasMore": true
}
```

**Response 401**: `{ "error": "Unauthorized" }`
**Response 400**: `{ "error": "PIN required" }`

---

## Fetch Single Session

```
GET /api/sessions?id=<session-uuid>
Headers: x-api-key, x-user-pin
```

**Response 200**: Full `EnrichedSessionSummary` JSON (fetched from blob URL).

**Response 404**: `{ "error": "Session not found" }`
**Response 400**: `{ "error": "Invalid session ID" }`

---

## Delete Single Session

```
DELETE /api/sessions?id=<session-uuid>
Headers: x-api-key, x-user-pin
```

**Response 200**: `{ "ok": true }`
- Deletes the session blob.
- Recalculates progress summary (totalSessions, bestWpm, bestAccuracy, totalCharsTyped).
- Writes updated progress summary to `progress-{pin}.json`.

**Response 404**: `{ "error": "Session not found" }`
**Response 400**: `{ "error": "Invalid session ID" }`

---

## Progress Endpoint Changes

**Route**: `PUT /api/progress` (existing, modified)

**Change**: When `newSession` is present in the payload:
1. Write the session as an individual blob at `neuralkeys/sessions/{pin}/{session.id}.json`.
2. Do NOT append to `allSessions` in the progress blob.
3. Write the progress summary (sans `allSessions`, sans `newSession`) to `progress-{pin}.json`.

**Backwards compatibility**: If `newSession` is absent (e.g., a full progress overwrite from a migration script), behaviour is unchanged except `allSessions` is stripped from the payload before writing.

---

## Migration Endpoint

```
POST /api/sessions?action=migrate
Headers: x-api-key, x-user-pin
```

**Behaviour**:
1. Read `progress-{pin}.json`.
2. If `allSessions` exists and has entries, write each as an individual session blob (skip any whose UUID already exists as a blob).
3. Clear `allSessions` from the progress blob and rewrite.
4. Return count of migrated sessions.

**Response 200**: `{ "migrated": 21, "skipped": 0 }`
**Response 200** (already migrated): `{ "migrated": 0, "skipped": 0 }`
