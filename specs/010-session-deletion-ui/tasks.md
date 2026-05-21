# Tasks: Session Deletion UI

**Input**: Design documents from `/specs/010-session-deletion-ui/`

**Tests**: BDD-style tests MANDATORY per Constitution Principle II.

## Phase 1: Setup

- [ ] T001 Create `components/UndoToast.tsx` — reusable toast with message, countdown, Undo button, auto-dismiss after 5s. Keyboard-operable, aria-live, dark-styled.

---

## Phase 2: User Story 1 — Delete with Undo (Priority: P1) 🎯 MVP

### Tests

- [ ] T002 [P] [US1] BDD test: Given session row visible, When delete tapped, Then row removed from DOM and undo toast appears in `tests/sessions.test.ts`
- [ ] T003 [P] [US1] BDD test: Given undo toast visible, When Undo pressed within 5s, Then row restored and no API call made in `tests/sessions.test.ts`
- [ ] T004 [P] [US1] BDD test: Given undo toast visible, When 5s elapse, Then deleteSession() called and row stays removed in `tests/sessions.test.ts`
- [ ] T005 [P] [US1] BDD test: Given API delete fails, When undo window expires, Then row restored and error toast shown in `tests/sessions.test.ts`

### Implementation

- [ ] T006 [US1] Add delete button (trash icon) to each session row in `app/stats/page.tsx` — only rendered when `session.id` exists. `p-3` for tap target, `aria-label` with session context.
- [ ] T007 [US1] Add pending-delete state management in `app/stats/page.tsx` — track `pendingDeletes: Map<string, { session, timeoutId }>`. On delete: remove from displayed list, add to pending, start 5s timeout.
- [ ] T008 [US1] Wire UndoToast into stats page — render one toast per pending delete (stacked). On undo: clear timeout, restore session to list, remove from pending. On expire: call `deleteSession()`, handle success/failure.
- [ ] T009 [US1] Handle delete failure — if `deleteSession()` returns false after undo window expires, restore the row and show error via the sync-error toast pattern.

**Checkpoint**: Delete + undo flow works end-to-end on the stats page.

---

## Phase 3: User Story 2 — Stats Recalculation (Priority: P2)

### Tests

- [ ] T010 [P] [US2] BDD test: Given session with bestWpm deleted, When committed, Then bestWpm recalculated from remaining sessions in `tests/sessions.test.ts`
- [ ] T011 [P] [US2] BDD test: Given session deleted, When committed, Then totalSessions and totalCharsTyped decremented in `tests/sessions.test.ts`

### Implementation

- [ ] T012 [US2] Add `recalculateProgress()` to `lib/progress.ts` — takes remaining sessions array, recomputes totalSessions, bestWpm, bestAccuracy, totalCharsTyped, levelProgress. Writes to localStorage.
- [ ] T013 [US2] Call `recalculateProgress()` after successful `deleteSession()` in the stats page delete handler. Update the displayed stats on the page.

**Checkpoint**: Aggregated stats are consistent after deletion.

---

## Phase 4: User Story 3 — Keyboard Accessibility (Priority: P3)

### Tests

- [ ] T014 [P] [US3] BDD test: Given keyboard-only user, When Tab through session list, Then delete buttons are focusable with visible ring in `tests/sessions.test.ts`
- [ ] T015 [P] [US3] BDD test: Given undo toast visible, When Tab pressed, Then Undo button receives focus in `tests/sessions.test.ts`

### Implementation

- [ ] T016 [US3] Verify delete button has visible focus ring (inherits from Tailwind defaults or add explicit `focus:ring-2`), descriptive `aria-label`, and responds to Enter/Space.
- [ ] T017 [US3] Verify UndoToast's Undo button is focusable, has `role="status"` + `aria-live="assertive"` on the container, and is keyboard-activatable.

**Checkpoint**: Full delete flow completable via keyboard.

---

## Phase 5: Polish

- [ ] T018 [P] Run full quality gate: lint + test + tsc + build
- [ ] T019 [P] Update CHANGELOG.md

---

## Dependencies

- Phase 1 → Phase 2 (US1 needs UndoToast) → Phase 3 (US2 needs delete committed) → Phase 4 (US3 verifies a11y on built UI) → Phase 5
- US1 tests (T002-T005) can all run in parallel
- US2 tests (T010-T011) can run in parallel
- US3 tests (T014-T015) can run in parallel
