# Feature Specification: Progress Persistence (PIN Profile + LocalStorage + Blob Sync)

**Feature Branch**: `004-progress-persistence`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for the backendless persistence model — a PIN-keyed user profile stored in `localStorage` and synced to Vercel Blob for cross-device portability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sessions persist across page reloads (Priority: P1)

A learner closes the tab and returns later; their unlocked levels, session
history, error heatmap, achievements, and tips MUST still be there.

**Why this priority**: the gamification, analytics, and unlock progression
all depend on durable state. Losing it on reload makes the product
unusable.

**Independent Test**: complete a drill session, reload the page — session
count, last WPM, error heatmap, and unlocked levels MUST match what was
shown before reload.

**Acceptance Scenarios**:

1. **Given** a user has 12 sessions recorded, **When** they reload the
   page, **Then** the stats panel still shows 12 sessions.
2. **Given** the user has unlocked `top-row`, **When** they reload,
   **Then** `top-row` remains unlocked and the drill opens on it.

### User Story 2 - Switch profiles via PIN (Priority: P1)

A learner can enter a PIN at the entry screen to load their profile. A
different PIN loads a different profile, isolating progress per learner.

**Why this priority**: lets multiple people share a device (e.g., siblings,
classroom) without overwriting each other.

**Acceptance Scenarios**:

1. **Given** the app is fresh on a device, **When** the user enters PIN
   `1234`, **Then** an empty profile is created locally for that PIN.
2. **Given** profile `1234` has 12 sessions and profile `5678` has 0,
   **When** the user signs out and enters `5678`, **Then** the stats panel
   shows 0 sessions for `5678`.

### User Story 3 - Sync progress across devices via Blob (Priority: P2)

A learner using PIN `1234` on their laptop sees the same progress when they
open the app on a tablet with the same PIN, because progress is synced to
Vercel Blob keyed on the PIN.

**Why this priority**: removes the "which device am I on?" friction. Not
required for single-device use.

**Independent Test**: complete a session on device A with PIN `1234`,
open the app on device B with the same PIN — the new session MUST be
visible there within a few seconds.

**Acceptance Scenarios**:

1. **Given** PIN `1234` has 12 sessions on device A, **When** device B
   opens the app with PIN `1234`, **Then** device B fetches and displays
   12 sessions.
2. **Given** the user finishes a session, **When** the session is
   recorded, **Then** the updated progress is pushed to Blob in the
   background (debounced/deferred so it does not block the UI).

### Edge Cases

- The user is offline when finishing a session — progress MUST persist
  locally; Blob sync MUST retry on next opportunity.
- Two devices write conflicting state simultaneously — last-write-wins on
  the Blob; brief divergence is acceptable since this is a single-user
  scenario.
- The Blob endpoint is unreachable — local-only mode continues to work
  silently; no error blocks the typing UI.
- The user clears localStorage — entering the same PIN re-fetches from
  Blob (if available) and rehydrates.
- An invalid/expired PIN is entered — input is normalized; any PIN string
  is acceptable (no central registry); a fresh empty profile is created if
  Blob has no record.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist `ProgressData` (sessions, unlocked
  levels, error heatmap, tips, practiceTargets, achievements, XP, streaks)
  to `localStorage` keyed by PIN.
- **FR-002**: System MUST gate the app behind a PIN entry screen on first
  load; an entered PIN selects/creates a profile.
- **FR-003**: System MUST push `ProgressData` to Vercel Blob at
  `neuralkeys/progress-{pin}.json` after each session, debounced or
  deferred to avoid blocking the typing surface.
- **FR-004**: System MUST attempt a Blob fetch on PIN entry to rehydrate
  progress for the entered PIN; missing blob → empty profile.
- **FR-005**: System MUST degrade gracefully when offline or when Blob is
  unreachable: local-only mode continues, no error toast blocks typing.
- **FR-006**: System MUST allow the user to switch profiles by signing out
  (clearing the active PIN session) and entering a different PIN.
- **FR-007**: System MUST NOT bundle any API keys or secrets — Blob
  read/write tokens are server-side environment variables on Vercel.

### Key Entities

- **ProgressData**: top-level user state (PIN-keyed): unlocked levels,
  session history, error heatmap, tips, practiceTargets, achievements,
  XP, streaks, lastLevel, demotion-tracker fields.
- **EnrichedSessionSummary**: per-session record with stats + timing
  metadata.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After completing a session and reloading, 100% of session
  fields (WPM, accuracy, mode, level, timing metadata) match pre-reload.
- **SC-002**: Switching PIN reloads progress with isolation — zero leakage
  between profiles, verified by a test that writes to PIN `A` and reads
  from PIN `B`.
- **SC-003**: Blob sync round-trip latency does NOT delay the start of the
  next drill (sync happens off the typing critical path).
- **SC-004**: Offline session completion + later online sync leaves zero
  data loss (the local session ends up in Blob within one online minute).

## Assumptions

- PIN is a low-friction profile selector, not a security boundary —
  collisions across users are accepted (the app is for personal/
  family/classroom use, not enterprise auth).
- Vercel Blob `BLOB_READ_WRITE_TOKEN` is configured in the deployment
  environment.
- `localStorage` quota (typically 5–10 MB) is sufficient for many years
  of session data per profile.
