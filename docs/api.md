# API Reference

All API routes are Vercel Functions (Fluid Compute). Authentication is via shared API key in the `x-api-key` header (timing-safe comparison) and user scoping via `x-user-pin` header.

## Authentication

| Header | Required | Description |
|--------|----------|-------------|
| `x-api-key` | Yes | Shared API key (`PROGRESS_API_KEY` env var, timing-safe compared) |
| `x-user-pin` | Yes | User's 4-8 digit PIN (digits only, validated server-side) |

## `GET /api/progress`

Fetch the aggregated progress summary for a PIN.

**Response 200**: Full `ProgressData` JSON (totalSessions, bestWpm, bestAccuracy, streaks, errorHeatmap, levelProgress, achievements, recentSessions, practiceTargets).

**Response 401**: Unauthorized (bad or missing API key).
**Response 400**: PIN required or invalid.
**Response 404**: No progress blob exists for this PIN.

## `PUT /api/progress`

Write progress summary + optionally store a new individual session blob.

**Request body**: `ProgressData` JSON. If `newSession` field is present, it's written as an individual blob at `neuralkeys/sessions/{pin}/{session.id}.json`. The `allSessions` field (if present) is stripped before writing.

**Response 200**: `{ "ok": true }`
**Response 413**: Payload too large (>2MB).
**Response 422**: Invalid data shape.

## `GET /api/sessions`

List individual session blobs for a PIN.

**Query params**:
- `cursor` (optional): Pagination cursor from a previous response.
- `id` (optional): If provided, fetches a single session by UUID instead of listing.

### List mode (no `id`)

**Response 200**:
```json
{
  "sessions": [
    { "id": "uuid", "url": "https://blob-url/...", "uploadedAt": "ISO-8601" }
  ],
  "cursor": "next-cursor-or-null",
  "hasMore": true
}
```

### Single fetch mode (`?id=uuid`)

**Response 200**: Full `EnrichedSessionSummary` JSON including timing metadata.
**Response 400**: Invalid session ID (must be UUID v4).
**Response 404**: Session not found.

## `DELETE /api/sessions?id=uuid`

Delete a single session blob and recalculate the progress summary.

**Response 200**: `{ "ok": true }`

Side effects:
- Session blob removed from Vercel Blob.
- Progress summary recalculated (totalSessions, bestWpm, bestAccuracy, totalCharsTyped) from remaining session blobs.
- Updated progress summary written back to `progress-{pin}.json`.

**Response 400**: Invalid session ID.
**Response 404**: Session not found.

## `POST /api/sessions?action=migrate`

Migrate legacy `allSessions` array to individual session blobs. Idempotent — skips sessions that already exist as blobs.

**Response 200**: `{ "migrated": 21, "skipped": 0 }`

## `POST /api/tips`

Generate an AI typing tip from error patterns.

**Request body**:
```json
{ "prompt": "You are a typing coach..." }
```

**Response 200**:
```json
{ "tip": "Short actionable tip", "explanation": "2-3 sentence explanation" }
```

**Response 401**: Unauthorized.
**Response 500**: AI provider unavailable.

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `PROGRESS_API_KEY` | Server | API key for route authentication |
| `NEXT_PUBLIC_PROGRESS_API_KEY` | Client (build-time) | Same key, inlined into client bundle for fetch calls |
| `BLOB_READ_WRITE_TOKEN` | Server | Vercel Blob SDK authentication |
| `ANTHROPIC_API_KEY` | Server | Claude API for AI tips |
| `NEXT_PUBLIC_APP_VERSION` | Client | Version display (optional) |
