# Feature Specification: Analytics & Stats Dashboard

**Feature Branch**: `005-analytics-stats`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for the `/stats` page and the inline analytics widgets that surface session history, error heatmaps, slow bigrams, hand stats, and practice frequency.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review session history on a dashboard (Priority: P1)

A learner visits `/stats` and sees a dashboard with WPM trend, accuracy
trend, sessions-per-week, mode breakdown, error distribution, and a
keyboard heatmap.

**Why this priority**: closing the loop on practice — without visible
trends, the learner has no reason to come back consistently.

**Independent Test**: complete several sessions, navigate to `/stats` —
each chart MUST display at least the data for the most recent session and
the dashboard MUST not crash on a fresh profile (zero sessions).

**Acceptance Scenarios**:

1. **Given** a profile with 30 sessions, **When** the user opens `/stats`,
   **Then** WPM-over-time, accuracy-over-time, and sessions-per-week
   charts render with all 30 data points.
2. **Given** an empty profile, **When** the user opens `/stats`, **Then**
   each chart renders an empty state (no console errors, no crash).
3. **Given** the user has typed errors on multiple keys, **When** the
   keyboard heatmap renders, **Then** keys with errors are visibly tinted
   in proportion to their error count.

### User Story 2 - See per-session timing analytics (Priority: P2)

After a session, the learner sees derived metrics: avg hold duration, avg
inter-key delay, slowest bigrams, fatigue ratio, consistency score, and
left/right hand error/delay stats.

**Why this priority**: turns raw keystrokes into actionable feedback (e.g.,
"your left ring finger is 30% slower than the rest").

**Acceptance Scenarios**:

1. **Given** a completed session, **When** the analytics summary renders,
   **Then** it displays the top 5 slowest bigrams sorted by `avgDelay`
   descending.
2. **Given** the session keystrokes, **When** the hand-stats panel
   renders, **Then** left and right hand totals (errors, total keystrokes,
   error rate, avg delay) are computed using the keyboard layout map
   (`lib/keyboard-layout.ts`).

### User Story 3 - See cumulative practice frequency heatmap (Priority: P3)

A GitHub-style practice heatmap shows how many sessions the learner did
per day over the last N weeks.

**Why this priority**: streak motivation and habit visibility — useful but
not required for the core loop.

**Acceptance Scenarios**:

1. **Given** sessions on 5 different days in the last 12 weeks, **When**
   the practice heatmap renders, **Then** exactly 5 cells are filled with
   a tint proportional to that day's session count.

### Edge Cases

- A session has zero keystrokes (cancelled mid-session) — analytics MUST
  exclude it.
- A session has no recorded bigrams (text shorter than 2 chars) — slow
  bigrams panel MUST show "no data" gracefully.
- A keystroke's key is not in the keyboard layout map — it MUST be
  attributed to "unknown" and not crash hand-stats computation.
- The user has only one session — trend charts MUST render a single point
  (not a line).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a `/stats` page with: WPM-over-time,
  accuracy-over-time, sessions-per-week, mode breakdown, error
  distribution, keyboard heatmap, and analytics summary.
- **FR-002**: System MUST compute per-session timing metadata
  (`SessionTimingMetadata`) including avg hold duration, avg inter-key
  delay, slowest bigrams (top 20), short presses, consistency score,
  fatigue ratio, and left/right `HandStats`.
- **FR-003**: System MUST persist `errorHeatmap` cumulatively across
  sessions: a per-character error count map.
- **FR-004**: System MUST attribute each keystroke to a hand (left/right/
  unknown) using the keyboard layout map.
- **FR-005**: All analytics computation MUST happen off the typing
  critical path (after session completion, not during).
- **FR-006**: All charts MUST render an empty state without crashing
  when the profile has zero sessions.
- **FR-007**: System MUST expose a `GET /api/progress?pin=XXXX` endpoint
  returning the user's `ProgressData` JSON (read from Blob), to support
  external read-only consumers (e.g., dashboards).

### Key Entities

- **SessionTimingMetadata**: `{ avgHoldDuration, avgInterKeyDelay,
  slowestBigrams[], shortPresses, consistencyScore, fatigueRatio,
  leftHand, rightHand }`.
- **HandStats**: `{ errors, total, errorRate, avgDelay }`.
- **errorHeatmap**: `Record<char, count>` cumulative across sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/stats` page renders all charts within 1 second on a profile
  with 200 sessions.
- **SC-002**: Empty profile produces zero console errors on `/stats`.
- **SC-003**: 100% of completed sessions appear in WPM-over-time and
  sessions-per-week within one render cycle.
- **SC-004**: Keystroke-to-paint latency on the typing surface is NOT
  affected by analytics computation (verified by profiling that no
  analytics code runs during keydown).

## Assumptions

- Recharts is the charting library; that choice is locked in for v1.x.
- The keyboard layout map is QWERTY-only for v1.x.
- The stats API is read-only; mutations only happen via the in-app flow.
