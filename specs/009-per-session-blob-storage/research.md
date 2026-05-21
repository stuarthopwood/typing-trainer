# Research: Per-Session Blob Storage

## R1: Vercel Blob `list` API — pagination and prefix filtering

**Decision**: Use `@vercel/blob`'s `list({ prefix, token })` with cursor-based pagination.

**Rationale**: The SDK's `list()` returns `{ blobs, cursor, hasMore }`. Pass `cursor` for subsequent pages. Prefix filtering (`neuralkeys/sessions/{pin}/`) scopes to a single user's sessions. No need to load all blobs at once — paginate in chunks of 100.

**Alternatives considered**:
- Store a session index in the progress blob (adds coupling; defeats the purpose of granular access).
- Use Blob metadata/tags for filtering (not supported in the current SDK for arbitrary queries).

## R2: Blob path design — flat vs nested

**Decision**: `neuralkeys/sessions/{pin}/{session-id}.json` — flat within each PIN's folder.

**Rationale**: All sessions for a PIN live at one prefix level. The `list` API returns them sorted by `uploadedAt` (newest first by default). No deeper nesting needed — UUIDs are unique, no date-based bucketing required at this scale (hundreds, not millions).

**Alternatives considered**:
- `neuralkeys/sessions/{pin}/{date}/{session-id}.json` — date bucketing adds complexity for listing all sessions; no benefit at this scale.
- Metadata in the blob name (e.g., `{timestamp}-{session-id}.json`) — tempting for sort order but `list` already sorts by upload time; encoding data in filenames is fragile.

## R3: Migration strategy for legacy `allSessions`

**Decision**: Lazy migration on first stats-page load. Read `allSessions` from progress blob, write each as an individual session blob, then clear `allSessions` from the progress blob.

**Rationale**: Avoids a separate migration script or deploy hook. The stats page is the only consumer of full history, so migration happens exactly when the data is needed. Idempotent — if partially complete, the next load picks up where it left off (blobs already written are skipped by checking existence).

**Alternatives considered**:
- Eager migration on app deploy (requires a deploy hook or admin endpoint; more operational complexity).
- Dual-read forever (read both `allSessions` and individual blobs, merge) — simpler initially but `allSessions` never gets cleaned up, blob keeps growing.

## R4: Progress summary recalculation after session delete

**Decision**: On DELETE, recalculate `totalSessions`, `bestWpm`, `bestAccuracy`, `totalCharsTyped` by listing remaining session blobs and scanning their metadata. Cache the result in `progress-{pin}.json`.

**Rationale**: Deletion is rare (manual action). The cost of listing + scanning is acceptable for an infrequent operation. Keeps the progress blob always consistent with the actual session set.

**Alternatives considered**:
- Decrement counters without re-scanning (fast but `bestWpm` can't be recomputed without knowing all remaining sessions — you'd need to check if the deleted session held the record).
- Mark sessions as "soft deleted" (adds complexity, defeats the purpose of actual deletion).

## R5: Handling concurrent session writes

**Decision**: No special handling needed. Each session gets a unique UUID path — there is no read-modify-write on a shared resource. The progress summary PUT uses `allowOverwrite: true` (already fixed in PR #13).

**Rationale**: Two devices completing sessions at the same instant write to different blob paths (`/sessions/{pin}/{uuid-a}.json` and `/sessions/{pin}/{uuid-b}.json`). The progress summary is eventually consistent — whichever device syncs last writes the most up-to-date aggregate.

**Alternatives considered**:
- Distributed locking / conditional writes (massive overkill for single-user, hundreds-of-sessions scale).
