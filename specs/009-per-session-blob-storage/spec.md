# Feature Specification: Per-Session Blob Storage

**Feature Branch**: `009-per-session-blob-storage`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "Per-session Blob storage — store each typing session as an individual blob at neuralkeys/sessions/{pin}/{session-id}.json on session end, while keeping the aggregated progress-{pin}.json as a lightweight summary. The stats page should aggregate from individual session blobs for full history (replacing the allSessions array approach). Individual sessions should be fetchable by ID, deletable, and listable. This enables future features like session sharing, deep-linking, and selective deletion without loading/rewriting the entire progress blob."

## User Scenarios & Testing

### User Story 1 — Session Persistence (Priority: P1)

When a user completes a typing session, the full session data is stored as an individual blob so it can be retrieved independently later.

**Why this priority**: This is the core write path — without it, no individual sessions exist to read, list, or delete.

**Independent Test**: Complete a typing drill, then verify a new blob exists at `neuralkeys/sessions/{pin}/{session-id}.json` containing the full session data including timing metadata.

**Acceptance Scenarios**:

1. **Given** a user with PIN 6767 completes a drill session, **When** the session ends and sync fires, **Then** a new blob is created at `neuralkeys/sessions/6767/{session-id}.json` containing the full `EnrichedSessionSummary` payload with timing metadata.
2. **Given** the session blob is written successfully, **When** the aggregated `progress-{pin}.json` is updated, **Then** the `allSessions` array is no longer appended to (removed from the write path); only summary fields (totalSessions, bestWpm, etc.) are written.
3. **Given** Blob write fails (network error, quota), **When** the user completes a session, **Then** local progress is still saved to localStorage and the sync-failure toast is shown. The session blob write is retried on the next successful sync.

---

### User Story 2 — Session Listing & Full History (Priority: P2)

The stats page loads session history by listing individual session blobs rather than reading a monolithic `allSessions` array from the progress blob.

**Why this priority**: The stats page is the primary consumer of historical session data. This decouples reading from the progress blob's size.

**Independent Test**: Navigate to `/stats` and verify all sessions appear correctly, aggregated from individual session blobs.

**Acceptance Scenarios**:

1. **Given** a user with 25 individual session blobs, **When** they navigate to the stats page, **Then** the page lists and aggregates all session blobs from `neuralkeys/sessions/{pin}/` to display WPM history, charts, and analytics.
2. **Given** some sessions were created before this feature (stored in `allSessions` in the progress blob), **When** the stats page loads, **Then** legacy sessions from `allSessions` are merged with individually-stored sessions, showing a complete history.
3. **Given** the user has more than 100 sessions, **When** the stats page loads, **Then** sessions are paginated or lazy-loaded so the page remains responsive.

---

### User Story 3 — Session Retrieval & Deletion (Priority: P3)

Individual sessions can be fetched by ID or deleted, enabling granular control over session history.

**Why this priority**: Builds on US1/US2 to enable future features (sharing, deep-linking, selective deletion) without requiring the full history to be loaded.

**Independent Test**: Fetch a single session by its ID via the API, then delete it and verify it no longer appears in the stats page listing.

**Acceptance Scenarios**:

1. **Given** a session exists at `neuralkeys/sessions/{pin}/{session-id}.json`, **When** the API receives a GET request for that session ID, **Then** it returns the full session payload.
2. **Given** a session exists, **When** the API receives a DELETE request for that session ID, **Then** the session blob is removed and the aggregated progress summary is recalculated (totalSessions decremented, bestWpm/bestAccuracy recomputed from remaining sessions).
3. **Given** a user requests deletion of a session that doesn't exist, **When** the API processes the request, **Then** it returns a 404 with no side effects.

---

### Edge Cases

- What happens when a session blob write succeeds but the progress summary update fails? The session exists but the summary is stale — acceptable; the summary can be recalculated from session blobs on next load.
- What happens when listing returns a very large number of sessions (500+)? Pagination via cursor or the Blob `list` API's native pagination should be used.
- What happens when two devices complete sessions at the same time? No conflict — each session gets a unique ID (UUID) and its own blob. The progress summary is eventually consistent.
- What about the migration path for existing `allSessions` data? On first stats-page load after upgrade, legacy `allSessions` entries are backfilled as individual blobs, then `allSessions` is cleared from the progress blob.

## Requirements

### Functional Requirements

- **FR-001**: System MUST write each completed session as an individual blob at `neuralkeys/sessions/{pin}/{session-id}.json` on session end.
- **FR-002**: System MUST maintain the aggregated `progress-{pin}.json` as a lightweight summary (totalSessions, bestWpm, bestAccuracy, streaks, errorHeatmap, levelProgress, achievements, practiceTargets). The `allSessions` array MUST be removed from the progress blob write path.
- **FR-003**: System MUST provide an API endpoint to list all sessions for a given PIN, returning metadata (id, date, wpm, accuracy, mode) without full timing data.
- **FR-004**: System MUST provide an API endpoint to fetch a single session by PIN + session ID, returning the full payload including timing metadata.
- **FR-005**: System MUST provide an API endpoint to delete a single session by PIN + session ID, removing the blob and recalculating the progress summary.
- **FR-006**: System MUST migrate legacy `allSessions` data to individual blobs on first access after upgrade, then remove `allSessions` from the progress blob.
- **FR-007**: System MUST handle session-blob write failures gracefully — local progress is preserved and the failure is surfaced to the user via the existing sync-error toast.

### Key Entities

- **Session Blob**: An individual JSON file at `neuralkeys/sessions/{pin}/{session-id}.json` containing the full `EnrichedSessionSummary` with timing metadata. Keyed by the session's UUID.
- **Progress Summary**: The existing `progress-{pin}.json` file, now stripped of `allSessions`. Contains aggregated stats, level progress, achievements, tips, practice targets.
- **Session Listing**: A lightweight view of all sessions (metadata only) produced by listing blobs in the `neuralkeys/sessions/{pin}/` prefix.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Individual session data can be retrieved by ID within 500ms (Blob direct-fetch latency).
- **SC-002**: Stats page loads full history for 100+ sessions within 3 seconds on a standard connection.
- **SC-003**: The progress blob size is reduced to under 10KB regardless of how many sessions the user has completed (currently grows unbounded with `allSessions`).
- **SC-004**: Deleting a single session does not require reading/rewriting the entire session history.
- **SC-005**: Migration of existing `allSessions` data to individual blobs completes transparently on first load with no data loss.

## Assumptions

- Vercel Blob `list` API supports prefix-based listing with pagination (confirmed in `@vercel/blob` SDK).
- Session UUIDs are globally unique (generated by `crypto.randomUUID()` — already in use).
- The Blob store's item limit is not a concern at the expected scale (hundreds of sessions per user, not millions).
- The existing `x-api-key` + `x-user-pin` auth model is sufficient for session CRUD operations.
- Users cannot access other users' sessions — PIN scoping in the blob path provides isolation.
