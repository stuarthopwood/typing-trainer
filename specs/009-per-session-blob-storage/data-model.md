# Data Model: Per-Session Blob Storage

## Entities

### SessionBlob

Individual session stored at `neuralkeys/sessions/{pin}/{session-id}.json`.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique session identifier (crypto.randomUUID) |
| timestamp | string (ISO 8601) | When the session was completed |
| date | string (YYYY-MM-DD) | Date portion for grouping |
| wpm | number | Words per minute |
| accuracy | number | Percentage (0-100) |
| mode | string | Mode label (e.g. "drill:home-row", "passage:beginner") |
| duration | number | Session duration in milliseconds |
| charsTyped | number | Total characters in the exercise |
| modeDetails | object | `{ type, level?, category? }` |
| timingMetadata | object \| undefined | Full `SessionTimingMetadata` (bigrams, hand stats, fatigue, etc.) |

This is identical to the existing `EnrichedSessionSummary` type — no new fields needed.

### ProgressSummary

Existing `progress-{pin}.json`, modified:

| Field | Change |
|-------|--------|
| allSessions | **REMOVED** from the write path. Not included in PUT payloads. |
| totalSessions | Kept — recalculated from session blob count on delete. |
| recentSessions | Kept — last 50, for fast dashboard rendering without listing blobs. |
| (all other fields) | Unchanged |

### SessionListItem

Lightweight metadata returned by the list endpoint (derived from blob metadata + partial read):

| Field | Type | Description |
|-------|------|-------------|
| id | string | Session UUID (extracted from blob pathname) |
| url | string | Public blob URL for direct fetch |
| uploadedAt | string (ISO 8601) | Blob upload timestamp |

For full data (wpm, accuracy, mode, timing), the client fetches the blob URL directly.

## Relationships

```
PIN 6767
├── progress-6767.json          (1:1 — lightweight summary)
└── sessions/6767/
    ├── {uuid-1}.json           (1:N — individual sessions)
    ├── {uuid-2}.json
    └── ...
```

## State Transitions

### Session Lifecycle

```
Created (in browser, localStorage)
  → Synced (individual blob written + progress summary updated)
  → [Optional] Deleted (blob removed + progress summary recalculated)
```

### Migration Lifecycle (one-time)

```
Legacy (allSessions in progress blob)
  → Migrating (each entry written as individual blob)
  → Migrated (allSessions cleared from progress blob)
```

## Validation Rules

- `pin` must be 4-6 digits (existing validation in `getBlobPath`).
- `session-id` must be a valid UUID v4 format.
- Session blob payload must pass `EnrichedSessionSummary` shape validation.
- Blob path traversal: PIN is sanitized to digits only; session ID is validated as UUID.
