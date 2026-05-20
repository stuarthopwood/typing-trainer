# Feature Specification: Gamification (XP, Achievements, Celebrations, Streaks, Sounds)

**Feature Branch**: `007-gamification`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for the dopamine layer — XP awards, unlockable achievements, post-session celebration tiers, streak tracking, and sound cues.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Earn XP per session (Priority: P1)

A learner completes a session and earns XP based on WPM, accuracy, and
mode. XP accumulates across sessions and is shown on the stats panel.

**Why this priority**: the headline reward signal — every session must
visibly add to a number that goes up.

**Acceptance Scenarios**:

1. **Given** a session completes at 50 WPM / 95% accuracy in drill mode,
   **When** XP is computed, **Then** the awarded XP is a deterministic
   function of those inputs and is added to `progress.xp`.
2. **Given** an existing XP total, **When** the next session ends, **Then**
   the running total is shown immediately on the stats panel.

### User Story 2 - Unlock achievements at milestones (Priority: P2)

Specific milestones (first 100 WPM session, 7-day streak, 100 sessions,
all levels unlocked, etc.) trigger achievement unlocks that show in a
dedicated panel.

**Why this priority**: variable-reward layer — not required, but
significantly improves retention.

**Acceptance Scenarios**:

1. **Given** the user has 99 completed sessions, **When** they finish
   their 100th, **Then** the "Centurion" (or equivalent) achievement
   unlocks and is appended to `progress.achievements`.
2. **Given** an achievement is already unlocked, **When** the same
   condition is met again, **Then** it is NOT re-awarded.

### User Story 3 - Post-session celebration tier (Priority: P2)

Sessions are graded into a celebration tier (`good`, `great`, `perfect`)
based on accuracy/WPM, with a corresponding visual flourish (border glow,
short sound) on completion.

**Why this priority**: immediate positive feedback in the moment of
completion — different from XP because it's emotional, not numeric.

**Acceptance Scenarios**:

1. **Given** a session at 100% accuracy and ≥40 WPM, **When** completion
   fires, **Then** the celebration tier is `perfect` and the perfect-tier
   visual + sound trigger.
2. **Given** sound is muted in the user's settings, **When** completion
   fires, **Then** no audio plays; visuals still trigger.

### User Story 4 - Track daily practice streak (Priority: P3)

Consecutive days with at least one completed session form a streak;
breaking a day resets it. Visible on the stats panel.

**Why this priority**: habit formation; nice to have but the core loop
works without it.

**Acceptance Scenarios**:

1. **Given** the user practiced yesterday and today, **When** the streak
   is computed, **Then** it shows `2`.
2. **Given** the user practiced 3 days ago and today (skipped yesterday),
   **When** the streak is computed, **Then** it shows `1` (today only).

### Edge Cases

- The user changes their device clock — streak computation is best-effort
  using local date; we accept that clock manipulation can game streaks.
- Two sessions complete within the same render tick — XP and achievements
  MUST award once per session, not per render.
- An achievement condition is added in a future version that the user has
  retroactively earned — the achievement MUST unlock the next time the
  app loads (or the next session) without crashing on missing legacy
  state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST compute and award XP per completed session
  using a deterministic function of WPM, accuracy, and mode.
- **FR-002**: System MUST persist running XP total in `progress.xp` and
  display it on the stats panel.
- **FR-003**: System MUST evaluate achievement conditions on session
  completion; newly satisfied conditions MUST unlock the achievement and
  append it to `progress.achievements`.
- **FR-004**: System MUST NOT re-award an already-unlocked achievement.
- **FR-005**: System MUST grade each session into a celebration tier
  (`none`, `good`, `great`, `perfect`) and trigger the corresponding
  visual flourish on completion.
- **FR-006**: Sound cues MUST be respect a user-controllable mute toggle
  and MUST gracefully no-op when audio is unavailable.
- **FR-007**: System MUST compute the practice streak from session
  timestamps using the local date, and display it on the stats panel.

### Key Entities

- **Achievement**: id, label, description, unlock condition.
- **CelebrationTier**: `none | good | great | perfect`.
- **progress.xp**, **progress.achievements**, **progress.streak**.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: XP function is deterministic — identical inputs MUST produce
  identical outputs in 100% of test runs.
- **SC-002**: 0% of unit tests show double-awards for a single session
  (idempotence).
- **SC-003**: Mute toggle suppresses 100% of session-completion sounds.

## Assumptions

- Achievements are static (compiled into the app) — no remote feature
  flagging.
- XP has no level cap or prestige system in v1.x.
- Sound assets are tiny WAV/MP3 bundled with the app.
