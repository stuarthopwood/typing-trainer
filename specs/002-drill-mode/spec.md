# Feature Specification: Drill Mode (Levels, Unlock, Demotion, Adaptive Targeting)

**Feature Branch**: `002-drill-mode`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for the drill engine — random generated text from a curated word/char bank, with progressive level unlock, two-bad-session demotion, and adaptive targeting.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practice on a level with auto-generated drill text (Priority: P1)

A learner picks a drill level (`home-row`, `top-row`, `bottom-row`, `numbers`,
`symbols`, `full`) and gets a fresh string of words/chars drawn from that
level's bank. Each completion auto-generates a new drill so practice is
continuous.

**Why this priority**: drills are the primary learning loop. Without them
there is no reason to use the app over a generic typing test.

**Independent Test**: pick `home-row`, complete a drill — every character in
the generated text MUST come from the home-row character set; on completion
a new drill text MUST appear immediately.

**Acceptance Scenarios**:

1. **Given** the user selects `home-row`, **When** drill text is generated,
   **Then** every character in the text is in the home-row alphabet (asdf
   ghjkl;) plus space.
2. **Given** drill mode is active, **When** the user finishes a drill,
   **Then** a new drill text is generated automatically (no manual reload).
3. **Given** the drill page loads, **When** the user has previously unlocked
   `top-row`, **Then** the drill opens on the highest unlocked level
   (`top-row`), not always `home-row`.

### User Story 2 - Progress to the next level by clearing the current one (Priority: P1)

A level unlocks the next level when the learner completes it with WPM and
accuracy above thresholds (e.g., ≥30 WPM, ≥90% accuracy across the most
recent N sessions). Locked levels are visible but not selectable.

**Why this priority**: the unlock progression is the gamification core; it's
how the app teaches incrementally.

**Acceptance Scenarios**:

1. **Given** the user has only `home-row` unlocked, **When** they complete
   `home-row` sessions meeting the unlock threshold, **Then** `top-row`
   becomes selectable.
2. **Given** a level is locked, **When** the user views the level selector,
   **Then** the locked level renders disabled with a hint about the unlock
   criteria.

### User Story 3 - Demote a level after two bad sessions (Priority: P2)

If a learner completes two consecutive sessions on a drill level with
accuracy < 70%, the level is re-locked and the active level drops to the
previous one. An inline amber toast explains why.

**Why this priority**: prevents a learner from grinding on a level they
aren't ready for; forces them back to the foundation when struggling.

**Independent Test**: on `top-row`, intentionally fail two sessions in a row
(<70% accuracy) — after the second, the level selector MUST show `top-row`
relocked, the active level MUST be `home-row`, and a toast MUST display.

**Acceptance Scenarios**:

1. **Given** the user is on `top-row` with one prior session at 65%
   accuracy, **When** they complete another session at 60% accuracy,
   **Then** `top-row` re-locks, active level becomes `home-row`, and a toast
   appears explaining the demotion.
2. **Given** the user is on `top-row` with one prior session at 65%
   accuracy, **When** they complete a session at 92% accuracy, **Then**
   no demotion occurs (the streak resets).

### User Story 4 - Adaptive drill targeting based on errors (Priority: P2)

Generated drill text biases ~40% of words toward characters and bigrams the
learner is currently struggling with (from the cumulative error heatmap, the
latest session's slow bigrams, and AI-detected error patterns). Targets
decay automatically: a char/bigram drops out once it stops appearing in
errors.

**Why this priority**: turns analytics into action — the user practices
their actual weaknesses without picking them manually.

**Acceptance Scenarios**:

1. **Given** the user has cumulative high error counts on `t` and `h`,
   **When** the next drill text is generated, **Then** a measurably higher
   proportion of words contain `t` and/or `h` than a uniform-random sample
   from the same word bank.
2. **Given** target chars `t,h`, **When** the user completes several clean
   sessions with no errors on `t` or `h`, **Then** those chars are removed
   from `practiceTargets` on the next update.
3. **Given** practice targets exist, **When** the drill page renders,
   **Then** a small targeting indicator (icon + tooltip listing the targets)
   appears near the level selector.

### Edge Cases

- A level's word bank has zero words containing the target chars/bigrams —
  fall back to standard random selection (no crash, no infinite loop).
- The user has unlocked levels but `practiceTargets` is empty (e.g., first
  session ever) — drill generates with normal random selection; indicator
  hidden.
- Demotion would push the user below `home-row` — clamp at `home-row` (no
  level lower exists).
- The level selector is opened mid-drill — switching levels MUST discard
  the current text and generate a fresh one.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose six drill levels: `home-row`, `top-row`,
  `bottom-row`, `numbers`, `symbols`, `full`.
- **FR-002**: System MUST generate drill text by drawing words/characters
  from the active level's curated bank.
- **FR-003**: System MUST auto-generate a new drill text on completion,
  with no user action required.
- **FR-004**: System MUST persist which levels are unlocked per user
  (PIN-keyed) and load them at app start.
- **FR-005**: Drill mode MUST open on the highest unlocked level by default.
- **FR-006**: System MUST unlock the next level when the user satisfies the
  unlock criteria on the current level (WPM + accuracy thresholds).
- **FR-007**: System MUST re-lock a level after two consecutive sessions
  with accuracy < 70% on that level, demoting the user to the previous
  level.
- **FR-008**: System MUST display an inline amber toast when a demotion
  occurs, naming the level and the reason.
- **FR-009**: System MUST compute `practiceTargets` from cumulative error
  heatmap, latest session's slow bigrams, and detected error patterns; max
  15 chars and 10 bigrams.
- **FR-010**: System MUST decay practice targets — chars/bigrams not
  appearing in the latest session's errors or slow bigrams are removed on
  next update.
- **FR-011**: When `practiceTargets` is non-empty, drill text generation
  MUST bias word selection so ≈40% of selected words contain a target char
  or bigram.
- **FR-012**: System MUST display a targeting indicator (icon + tooltip)
  in the drill UI when `practiceTargets` is non-empty.
- **FR-013**: Locked levels MUST be visible but disabled in the selector,
  with a hint about the unlock criteria.

### Key Entities

- **DrillLevel**: enum of six level identifiers.
- **DrillConfig**: `{ level, chars, label }` — metadata for a level's bank.
- **PracticeTargets**: `{ chars[], bigrams[], updatedAt }` stored in
  `ProgressData`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of characters in generated drill text belong to the
  active level's character set.
- **SC-002**: When `practiceTargets` is set, ≥35% (target ~40%) of generated
  words contain a target char or bigram, measured over 100 sequential drill
  generations.
- **SC-003**: Two consecutive sub-70% sessions on a level result in a
  demotion in 100% of test runs.
- **SC-004**: A clean session (no errors on a target char) removes that
  char from `practiceTargets` on the next update in 100% of test runs.

## Assumptions

- The curated word banks for each level already exist in `lib/drills.ts`.
- Unlock thresholds and the two-session demotion rule are encoded in
  `lib/progress.ts` / `lib/drills.ts` and are tunable but not user-facing
  configuration.
- The app is single-user-at-a-time per browser; PIN switching reloads
  progress.
