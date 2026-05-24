# Tasks: Zen Mode

**Input**: Design documents from `/specs/011-zen-mode/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: BDD-style tests MANDATORY per Constitution Principle II.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Shared types, API scaffolding, new component shells

- [ ] T001 Add `"zen"` to `TrainingMode` union and add `topic?: string` + `wordCount?: number` + `misspelledWords?: string[]` to `modeDetails` in `lib/types.ts`
- [ ] T002 [P] Create `app/api/zen-topic/route.ts` with auth scaffolding (reuse `isAuthorized` pattern from progress route), placeholder response
- [ ] T003 [P] Create `app/api/zen-spellcheck/route.ts` with auth scaffolding, request validation (1-5 words + context), placeholder response
- [ ] T004 [P] Create `lib/zen.ts` with exported function signatures: `fetchZenTopic()`, `checkSpelling()`, `buildZenSessionStats()` — stub implementations

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: API routes must work before UI can consume them

- [ ] T005 Implement `POST /api/zen-topic` — call Anthropic Haiku with prompt requesting a single open-ended question (5-10 words), parse response, return `{ topic }` in `app/api/zen-topic/route.ts`
- [ ] T006 Implement `POST /api/zen-spellcheck` — call Anthropic Haiku with words + context, request JSON array of `{ word, correct, suggestion, index }` results, 3-second timeout, return `{ results }` in `app/api/zen-spellcheck/route.ts`
- [ ] T007 [P] Implement `fetchZenTopic()` in `lib/zen.ts` — call `/api/zen-topic`, return topic string or null on failure
- [ ] T008 [P] Implement `checkSpelling()` in `lib/zen.ts` — call `/api/zen-spellcheck` with words + context, 3s AbortController timeout, return results array or empty on failure
- [ ] T009 [P] Implement `buildZenSessionStats()` in `lib/zen.ts` — compute WPM (totalChars/5/durationMinutes), accuracy (correctWords/checkedWords×100), extract misspelled word list
- [ ] T010 [P] Write BDD tests for `fetchZenTopic`, `checkSpelling`, `buildZenSessionStats` in `tests/zen.test.ts`

**Checkpoint**: API routes return real AI responses. Client helpers work.

---

## Phase 3: User Story 1 — Free-Type on Generated Topic (Priority: P1) 🎯 MVP

**Goal**: User selects Zen Mode, sees a topic, types freely, clicks Done, gets session summary.

**Independent Test**: Select Zen → topic appears → type 20+ words → Done → WPM + word count shown.

### Tests

- [ ] T011 [P] [US1] BDD test: Given API key configured, When user views mode selector, Then Zen button appears in `tests/zen.test.ts`
- [ ] T012 [P] [US1] BDD test: Given Zen mode selected, When activated, Then topic prompt displayed and typing area ready in `tests/zen.test.ts`
- [ ] T013 [P] [US1] BDD test: Given user typed 20+ words, When Done clicked, Then session summary shows WPM and word count in `tests/zen.test.ts`
- [ ] T014 [P] [US1] BDD test: Given user clicks New Topic while typing, When confirmed, Then session cancelled and fresh topic generated in `tests/zen.test.ts`

### Implementation

- [ ] T015 [US1] Create `components/ZenTypingArea.tsx` — textarea (hidden, captures input) + overlay div (renders styled text). Password-manager suppression attributes. Fixed-height container. Current line white, previous lines fading (opacity 1.0 → 0.6 → 0.3 → 0.15). Auto-scroll to keep current line at bottom.
- [ ] T016 [US1] Create `components/ZenResponsePanel.tsx` — scrollable div showing full typed response. Auto-scrolls to latest. Styled dark panel with good line-height.
- [ ] T017 [US1] Add Zen button to `components/ModeSelector.tsx` — third icon button (only rendered when `NEXT_PUBLIC_PROGRESS_API_KEY` is truthy). When zen active: show topic text + "New Topic" button.
- [ ] T018 [US1] Wire Zen Mode into `app/page.tsx` — add `zenTopic` state, `fetchZenTopic` on mode switch, render `ZenTypingArea` + `ZenResponsePanel` when `mode === "zen"` (hide VisualKeyboard). Pass keystroke tracking callbacks. Show live WPM + time + word count (no combo, no live accuracy).
- [ ] T019 [US1] Implement Done button in `ZenTypingArea.tsx` — disabled until wordCount >= 20. On click: call `onComplete` with keystrokes + typed text + spell results.
- [ ] T020 [US1] Handle zen session completion in `app/page.tsx` — call `buildZenSessionStats()`, record session with `modeDetails.type = "zen"` + topic, award XP, count toward streak. Show session summary.
- [ ] T021 [US1] Handle "New Topic" in `app/page.tsx` — if typing in progress, cancel session (no recording), clear text, fetch new topic.

**Checkpoint**: Full zen flow works: select → topic → type → Done → summary.

---

## Phase 4: User Story 2 — Real-Time Spell-Checking (Priority: P2)

**Goal**: Misspelled words get red underlines during typing via hybrid batch check.

**Independent Test**: Type "teh quikc brown fox" → after pause, "teh" and "quikc" get red underlines.

### Tests

- [ ] T022 [P] [US2] BDD test: Given 5 words typed without pause, When 5th word completed, Then batch spell-check fires in `tests/zen.test.ts`
- [ ] T023 [P] [US2] BDD test: Given user pauses 1.5s, When unchecked words exist, Then batch spell-check fires in `tests/zen.test.ts`
- [ ] T024 [P] [US2] BDD test: Given spell-check returns misspelled word, When result arrives, Then word gets red underline in `tests/zen.test.ts`
- [ ] T025 [P] [US2] BDD test: Given spell-check times out, When Done clicked, Then catch-up check runs on unchecked words in `tests/zen.test.ts`

### Implementation

- [ ] T026 [US2] Add spell-check trigger logic to `ZenTypingArea.tsx` — track unchecked words in a ref. On input: if uncheckedWords.length >= 5, fire batch. Start a 1.5s debounce timer on each input; on timer expiry if unchecked words exist, fire batch. Reset timer on each input.
- [ ] T027 [US2] Integrate spell-check results into the overlay rendering in `ZenTypingArea.tsx` — maintain a `spellResults` map (word start index → result). Words marked misspelled render with `decoration-red-500 underline` class. Update overlay on results arrival.
- [ ] T028 [US2] Add final catch-up check to Done handler — collect all unchecked words, fire one final `checkSpelling()` batch, await result, then complete session with full accuracy calculation.
- [ ] T029 [US2] Show red underlines in `ZenResponsePanel.tsx` — response panel also highlights misspelled words (reads from same spellResults data passed as prop).

**Checkpoint**: Spell-check working in real-time with visual feedback.

---

## Phase 5: User Story 3 — Session Recording & Progression (Priority: P3)

**Goal**: Zen sessions integrate with XP/achievements/streaks but stay separate from drill aggregates.

**Independent Test**: Complete zen session → XP awarded, streak counted, bestWpm NOT affected.

### Tests

- [ ] T030 [P] [US3] BDD test: Given zen session completed, When XP calculated, Then base + accuracy bonus awarded in `tests/zen.test.ts`
- [ ] T031 [P] [US3] BDD test: Given zen session with 30+ WPM, When achievements checked, Then speed-30 unlockable in `tests/zen.test.ts`
- [ ] T032 [P] [US3] BDD test: Given zen session completed, When bestWpm checked, Then zen WPM excluded from aggregate in `tests/zen.test.ts`

### Implementation

- [ ] T033 [US3] Modify `app/page.tsx` `handleComplete` (zen path) — award XP (same formula), count streak, check achievements (allow WPM/accuracy milestones), but skip `processDrillDemotion` and skip adding to `errorHeatmap`.
- [ ] T034 [US3] Modify `lib/progress.ts` — ensure `recordSession` with mode starting with `"zen"` does NOT increment `levelProgress` for any drill level.
- [ ] T035 [US3] Verify stats page displays zen sessions with topic tag and "zen" mode label (existing `EnrichedSessionSummary` display should handle this — confirm no changes needed).

**Checkpoint**: Zen sessions properly integrated with progression system.

---

## Phase 6: User Story 4 — Mode Visibility & API Gating (Priority: P3)

**Goal**: Zen Mode hidden when no API key configured.

### Tests

- [ ] T036 [P] [US4] BDD test: Given no API key, When mode selector renders, Then only Drill and Passage shown in `tests/zen.test.ts`
- [ ] T037 [P] [US4] BDD test: Given topic generation fails, When error occurs, Then retry message shown in `tests/zen.test.ts`

### Implementation

- [ ] T038 [US4] Conditional render in `ModeSelector.tsx` — only show Zen button when `typeof window !== "undefined" && process.env.NEXT_PUBLIC_PROGRESS_API_KEY` is truthy.
- [ ] T039 [US4] Error state in zen mode — if `fetchZenTopic` returns null, show "Couldn't generate topic — try again" with a retry button instead of the typing area.

**Checkpoint**: Mode gating works. Error handling graceful.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T040 [P] Add password-manager suppression to existing `components/PinEntry.tsx` (`data-1p-ignore`, `data-lpignore="true"`, `data-form-type="other"`)
- [ ] T041 [P] Update `CHANGELOG.md` under v1.5.0 heading
- [ ] T042 Bump version to 1.5.0 in `package.json`
- [ ] T043 Run full quality gate (Phase 1 + Phase 2 sub-agents, up to 4 cycles)
- [ ] T044 Run quickstart.md verification steps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational (needs working API + helpers)
- **US2 (Phase 4)**: Depends on US1 (needs ZenTypingArea component to add spell-check to)
- **US3 (Phase 5)**: Depends on US1 (needs zen session completion flow)
- **US4 (Phase 6)**: Independent of US2/US3 (only needs ModeSelector from US1)
- **Polish (Phase 7)**: Depends on all user stories

### Parallel Opportunities

- T002, T003, T004 can run in parallel (Setup — different files)
- T007, T008, T009, T010 can run in parallel (Foundational — different functions)
- All tests within a story can run in parallel
- T040, T041 can run in parallel with each other (Polish)

---

## Implementation Strategy

### MVP First (User Story 1)

1. Setup + Foundational → API working, helpers ready
2. US1 → full zen flow: select → topic → type → Done → summary
3. **STOP and TEST**: verify in browser before proceeding

### Incremental

4. US2 → spell-check with visual feedback
5. US3 → progression integration
6. US4 → mode gating
7. Polish → quality gate, changelog, version bump
