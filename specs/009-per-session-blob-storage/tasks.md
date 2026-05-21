# Tasks: Per-Session Blob Storage

**Input**: Design documents from `/specs/009-per-session-blob-storage/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: For NeuralKeys, BDD-style tests are MANDATORY per Constitution Principle II. Every functional requirement and every acceptance scenario from the spec MUST have a corresponding `describe/it` test with explicit Given/When/Then phases. Coverage on touched files in `lib/**` and `components/**` MUST stay between 80% and 100% (lines AND branches).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Shared infrastructure for session blob operations

- [x] T001 Create `app/api/sessions/route.ts` with auth scaffolding (copy pattern from `app/api/progress/route.ts` — `isAuthorized`, `getBlobPath`, PIN validation)
- [x] T002 [P] Create `lib/sessions.ts` with type exports and placeholder functions (`listSessions`, `deleteSession`, `migrateAllSessions`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Modify `app/api/progress/route.ts` PUT handler: when `newSession` is present, write it as an individual blob at `neuralkeys/sessions/{pin}/{session.id}.json` using `put()` with `allowOverwrite: true`. Strip `allSessions` from the progress blob payload before writing.
- [x] T004 [P] Add UUID v4 format validation helper to `app/api/sessions/route.ts` for session ID path parameter sanitization
- [x] T005 [P] Write BDD tests for the modified PUT handler in `tests/progress.test.ts` — Given a session payload, When PUT fires, Then individual blob is created AND allSessions is not written to progress blob

**Checkpoint**: Progress route now writes individual session blobs. User story implementation can begin.

---

## Phase 3: User Story 1 — Session Persistence (Priority: P1) 🎯 MVP

**Goal**: When a user completes a session, it's stored as an individual blob and the progress summary is updated without `allSessions`.

**Independent Test**: Complete a drill session → verify blob exists at `neuralkeys/sessions/{pin}/{id}.json` with full `EnrichedSessionSummary` payload.

### Tests for User Story 1

- [x] T006 [P] [US1] BDD test: Given session completes, When syncToRemote fires, Then individual session blob is written at correct path in `tests/sessions.test.ts`
- [x] T007 [P] [US1] BDD test: Given sync fails (network error), When session completes, Then local progress is preserved and sync-error toast fires in `tests/sessions.test.ts`
- [x] T008 [P] [US1] BDD test: Given session written successfully, When progress blob is read, Then allSessions array is absent in `tests/sessions.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Modify `lib/progress.ts` `syncToRemote`: pass `newSession` to the PUT endpoint (already does this). Ensure the response includes confirmation that session blob was written. Remove any client-side `allSessions` accumulation logic.
- [x] T010 [US1] Verify `app/page.tsx` `handleComplete` correctly passes the enriched session to `syncToRemote` (already does — confirm no changes needed, only verify the data shape matches what the new PUT handler expects)

**Checkpoint**: Sessions are being individually stored. The old `allSessions` growth path is eliminated.

---

## Phase 4: User Story 2 — Session Listing & Full History (Priority: P2)

**Goal**: Stats page loads session history from individual blobs instead of the `allSessions` array.

**Independent Test**: Navigate to `/stats` → all sessions appear correctly, aggregated from individual session blobs.

### Tests for User Story 2

- [x] T011 [P] [US2] BDD test: Given 5 individual session blobs exist, When list endpoint is called, Then all 5 are returned with metadata in `tests/sessions.test.ts`
- [x] T012 [P] [US2] BDD test: Given legacy allSessions exists in progress blob, When stats page loads, Then legacy sessions are merged with individual blobs in `tests/sessions.test.ts`
- [x] T013 [P] [US2] BDD test: Given more than 100 sessions, When list is called without cursor, Then first page returned with cursor + hasMore=true in `tests/sessions.test.ts`

### Implementation for User Story 2

- [x] T014 [US2] Implement `GET /api/sessions` (list) in `app/api/sessions/route.ts` — use `@vercel/blob` `list({ prefix: 'neuralkeys/sessions/{pin}/', token, cursor })`, return `{ sessions, cursor, hasMore }`
- [x] T015 [US2] Implement `loadAllSessions()` in `lib/sessions.ts` — client-side helper that calls the list endpoint, fetches each blob URL for full data, handles pagination
- [x] T016 [US2] Modify `app/stats/page.tsx` to use `loadAllSessions()` from `lib/sessions.ts` instead of `loadFullHistory()` from `lib/progress.ts`. Merge with legacy `recentSessions` from progress blob for backwards compat.
- [x] T017 [US2] Implement migration endpoint `POST /api/sessions?action=migrate` in `app/api/sessions/route.ts` — read allSessions from progress blob, write each as individual blob, clear allSessions from progress blob
- [x] T018 [US2] Auto-trigger migration on first stats-page load if `allSessions` is detected in the progress blob (call migrate endpoint, then reload session list)

**Checkpoint**: Stats page reads from individual blobs. Legacy data is migrated transparently.

---

## Phase 5: User Story 3 — Session Retrieval & Deletion (Priority: P3)

**Goal**: Individual sessions can be fetched by ID or deleted.

**Independent Test**: Fetch a session by ID via API → full payload returned. Delete it → 404 on re-fetch, stats page no longer shows it.

### Tests for User Story 3

- [x] T019 [P] [US3] BDD test: Given session exists, When GET ?id={uuid} is called, Then full session payload returned in `tests/sessions.test.ts`
- [x] T020 [P] [US3] BDD test: Given session exists, When DELETE ?id={uuid} is called, Then blob is removed and progress summary recalculated in `tests/sessions.test.ts`
- [x] T021 [P] [US3] BDD test: Given session does not exist, When DELETE is called, Then 404 returned with no side effects in `tests/sessions.test.ts`

### Implementation for User Story 3

- [x] T022 [US3] Implement `GET /api/sessions?id={uuid}` (fetch single) in `app/api/sessions/route.ts` — validate UUID, use `head()` to get blob URL, fetch and return full payload
- [x] T023 [US3] Implement `DELETE /api/sessions?id={uuid}` in `app/api/sessions/route.ts` — validate UUID, use `del()` to remove blob, then recalculate progress summary (list remaining sessions, compute bestWpm/bestAccuracy/totalSessions/totalCharsTyped, rewrite progress blob)
- [x] T024 [US3] Add `deleteSession()` helper to `lib/sessions.ts` — client-side function that calls DELETE endpoint and returns updated progress summary

**Checkpoint**: Full CRUD for individual sessions is operational.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, backwards compatibility, documentation

- [x] T025 Remove `loadFullHistory()` from `lib/progress.ts` (dead code after US2 replaces it with `loadAllSessions()`)
- [x] T026 Remove `allSessions` handling from `GET /api/progress` (the `?full=true` path that returned allSessions — no longer needed)
- [x] T027 [P] Update `CHANGELOG.md` under v1.3.0 heading (new feature: per-session Blob storage)
- [x] T028 [P] Run full quality gate: lint + test + coverage + tsc + build
- [x] T029 Run quickstart.md verification steps against the preview deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2)
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2). Independent of US1 (list reads what the foundational PUT writes).
- **User Story 3 (Phase 5)**: Depends on US2 (needs list infrastructure). Can start after T014 is done.
- **Polish (Phase 6)**: Depends on all user stories being complete

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/types before services
- Server-side (API route) before client-side (lib helpers)
- Core implementation before UI integration
- Story complete before moving to next priority

### Parallel Opportunities

- T001, T002 can run in parallel (Setup)
- T004, T005 can run in parallel with T003 (different files)
- All tests within a story (T006-T008, T011-T013, T019-T021) can run in parallel
- T025, T026, T027, T028 can run in parallel (Polish)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Complete a session, verify individual blob exists
5. Push for preview testing

### Incremental Delivery

1. Setup + Foundational → session blobs being written
2. Add US1 → verify write path works → Deploy
3. Add US2 → stats page reads from blobs, migration works → Deploy
4. Add US3 → fetch/delete operational → Deploy
5. Polish → cleanup dead code, changelog, quality gate → Final PR
