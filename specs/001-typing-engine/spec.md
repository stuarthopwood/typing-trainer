# Feature Specification: Typing Engine (Core Hot Path)

**Feature Branch**: `001-typing-engine`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive specification for the foundational typing surface that all modes depend on.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Type characters with zero-latency feedback (Priority: P1)

A learner types text on screen and sees each character flip from "pending" to
"correct" or "incorrect" the instant the matching key goes down. Mistakes
remain visible so the learner can see what they got wrong; correct keystrokes
advance the cursor.

**Why this priority**: this IS the product. Everything else (drills, passages,
stats, tips) is meaningless if the typing surface lags or drops keystrokes.

**Independent Test**: load the app, start any drill, hold down a sequence of
keys; every keystroke MUST be reflected in the rendered text within one frame
(<16 ms p95) and accuracy/WPM at completion must match a stopwatch'd
keystroke log.

**Acceptance Scenarios**:

1. **Given** a fresh session with text "the quick brown", **When** the user
   types "the" correctly, **Then** the first three characters render in the
   correct-color state and the cursor advances to the space.
2. **Given** mid-text typing, **When** the user presses an incorrect key,
   **Then** the expected character renders in the incorrect-color state, the
   cursor does NOT advance, and the keystroke is recorded as an error.
3. **Given** the user holds a single key with auto-repeat off, **When** the
   key fires once, **Then** exactly one keystroke is recorded.
4. **Given** the text body has hundreds of characters, **When** any key is
   pressed, **Then** only the active character re-renders (memoized `Char`),
   not the whole body.

### User Story 2 - Track per-keystroke timing for analytics (Priority: P2)

The engine records timestamp, hold duration, and inter-key delay for every
keystroke so downstream analytics (slow bigrams, fatigue ratio, hand stats)
have the raw data they need.

**Why this priority**: enables every other analytic feature, but the user
never directly sees this — they see derived metrics.

**Independent Test**: complete a session, inspect the recorded keystroke
array — every entry must have `timestamp`, `correct`, `expected`, `actual`;
held keys must record `keyUpTimestamp` and `holdDuration`; non-first keystrokes
must record `interKeyDelay`.

**Acceptance Scenarios**:

1. **Given** the user types two consecutive keys 120 ms apart, **When** the
   session ends, **Then** the second keystroke's `interKeyDelay` is 120
   (±browser timer resolution).
2. **Given** the user holds a key for 80 ms, **When** they release it,
   **Then** the keystroke's `holdDuration` is 80 (±resolution).

### User Story 3 - Compute session stats on completion (Priority: P2)

When the text is fully typed, the engine derives WPM, accuracy, total chars,
correct chars, errors, and duration and hands them upstream for celebration,
persistence, and stats display.

**Why this priority**: required for anything to be saved. Without stats, no
progress, no graphs, no levels.

**Acceptance Scenarios**:

1. **Given** a 60-char text typed in 30 seconds with 3 errors, **When**
   completion fires, **Then** WPM ≈ 24 (60 chars / 5 = 12 words, doubled for
   per-minute), accuracy ≈ 95% (57/60), errors = 3.
2. **Given** zero keystrokes, **When** the user navigates away, **Then** no
   session record is created.

### Edge Cases

- User presses a modifier key (Shift, Ctrl, Alt) — keystroke MUST be ignored,
  not recorded as an error.
- User pastes text — the engine MUST ignore paste (typing trainer requires
  individual keystrokes).
- Browser tab loses focus mid-session — timing for the next keystroke after
  refocus MUST NOT be charged as a "slow" keystroke (clamped or marked).
- User types past the end of the text — extra keystrokes MUST NOT crash;
  completion MUST fire on the last expected character.
- Backspace — accepted; cursor moves back one position; the previous
  keystroke is marked as "amended" (still counts for error rate).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render typed characters within one animation frame
  of the keydown event (target p95 < 16 ms).
- **FR-002**: System MUST record every printable keystroke as a `KeyStroke`
  entry with `expected`, `actual`, `timestamp`, and `correct`.
- **FR-003**: System MUST memoize the per-character render component so that
  one keystroke does not re-render the entire text body.
- **FR-004**: System MUST store the live keystroke buffer in a `useRef` (not
  React state) to avoid re-renders on each key.
- **FR-005**: System MUST ignore non-printable keys (Shift, Ctrl, Alt, Meta,
  Tab, arrows, function keys) for the purposes of advancing the cursor or
  recording errors.
- **FR-006**: System MUST capture `keyUpTimestamp` and derive `holdDuration`
  for held keys, and `interKeyDelay` between consecutive keystrokes.
- **FR-007**: System MUST compute final session stats (WPM, accuracy, errors,
  duration, total/correct chars) on completion of the text.
- **FR-008**: System MUST NOT record a session if no keystrokes occurred.
- **FR-009**: System MUST handle backspace by retreating the cursor and
  marking the prior keystroke amended; errors already counted MUST stay
  counted.

### Key Entities

- **KeyStroke**: a single recorded keypress (`expected`, `actual`,
  `timestamp`, `correct`, `keyUpTimestamp?`, `holdDuration?`,
  `interKeyDelay?`).
- **SessionStats**: derived summary (`wpm`, `accuracy`, `totalChars`,
  `correctChars`, `errors`, `duration`, `keyStrokes[]`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Keystroke-to-paint p95 latency < 16 ms on a Lighthouse "mobile"
  profile.
- **SC-002**: Computed session WPM matches a stopwatch'd manual calculation
  to within 1 WPM for any 60-second session.
- **SC-003**: 100% of printable keystrokes during a session appear in the
  recorded keystroke array (no drops).
- **SC-004**: Re-render count per keystroke ≤ 1 component (the active
  `Char`), measurable via React DevTools profiler.

## Assumptions

- Modern evergreen browser (Chrome/Edge/Firefox/Safari current minus 2).
- Hardware keyboard with key repeat configured by the OS (the engine
  intentionally does not deduplicate auto-repeat).
- The user's system clock and `performance.now()` are monotonically
  increasing within a session.
- Touch devices are out of scope for this feature (the visual keyboard
  feature provides on-screen keys for tablets, but keystroke-to-paint
  budgets target physical keyboards).
