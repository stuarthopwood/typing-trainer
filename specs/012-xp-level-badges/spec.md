# Feature Specification: XP Level Badges

**Feature Branch**: `012-xp-level-badges`

**Created**: 2026-05-22

**Status**: Draft

**Input**: User description: "XP Level Badges — 15 snarky badges awarded at each XP level threshold. Renders as FontAwesome layered icons with neon glow. Unlocked badges persist in ProgressData. Badge gallery on stats page, current badge next to XP bar. Unlock triggers toast + confetti (motion-safe)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Badge Unlock on Level-Up (Priority: P1)

When a user completes a typing session and their XP crosses a level threshold, they earn the corresponding badge. A celebratory toast notification appears with the badge name and subtitle, accompanied by a confetti burst.

**Why this priority**: Core value proposition — badges only have meaning if they unlock at the right time with satisfying feedback.

**Independent Test**: Complete a session that pushes XP past level 2 threshold; verify toast appears with "Hunt & Pecker" badge, confetti fires, and badge persists in localStorage progress data.

**Acceptance Scenarios**:

1. **Given** a user at level 1 with 90 XP (level 2 at 100), **When** they complete a session earning 15 XP, **Then** the "Hunt & Pecker" badge unlocks with a toast notification showing name + subtitle
2. **Given** a user crossing a level threshold, **When** the badge unlock toast appears, **Then** a confetti animation plays (skipped if `prefers-reduced-motion: reduce`)
3. **Given** a user who already has a badge, **When** they revisit the app, **Then** the badge remains unlocked (persisted in progress data)
4. **Given** a user who levels up multiple levels in one session (edge case), **When** XP crosses two thresholds at once, **Then** only the highest newly-earned badge shows in the toast

---

### User Story 2 - Badge Gallery on Stats Page (Priority: P2)

Users can view all 15 badges in a gallery on the stats dashboard. Unlocked badges display in full colour with neon glow; locked badges appear as greyed silhouettes with a "Level N" label.

**Why this priority**: Provides motivation by showing what's ahead and celebrating what's earned.

**Independent Test**: Navigate to stats page; verify all 15 badge slots render, unlocked ones glow, locked ones are greyed.

**Acceptance Scenarios**:

1. **Given** a user with 3 unlocked badges, **When** they visit the stats page, **Then** badges 1-3 show in full colour and badges 4-15 show as locked silhouettes
2. **Given** a locked badge slot, **When** viewed in the gallery, **Then** it shows the level number required to unlock it
3. **Given** an unlocked badge, **When** viewed in the gallery, **Then** it shows the badge icon, name, subtitle, and unlock date

---

### User Story 3 - Current Badge in XP Bar (Priority: P3)

The user's highest earned badge displays as a small icon next to the XP progress bar in the main UI header.

**Why this priority**: Subtle persistent reinforcement of progress, but not critical to the badge system functioning.

**Independent Test**: Earn a badge, verify it appears next to the XP bar on the main page.

**Acceptance Scenarios**:

1. **Given** a user at level 5 (QWERTY Apprentice), **When** viewing the main typing page, **Then** the level 5 badge icon displays adjacent to the XP bar
2. **Given** a brand new user (level 1), **When** viewing the main page, **Then** the level 1 "Caveman" badge displays next to the XP bar
3. **Given** the user levels up during a session, **When** returning to the main view, **Then** the badge icon updates to the new level's badge

---

### Edge Cases

- What happens when progress data has no badges array (migration from old format)? System adds an empty badges array and retroactively unlocks badges for the user's current level.
- What happens if FontAwesome icons referenced in badge config aren't available (Pro-only)? Fallback to Free alternatives (documented in badge definitions).
- What if XP is manually corrupted/edited in localStorage? Badge unlock only fires via the session-complete flow, not on raw XP reads.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define 15 badges, one per XP level, each with a unique name, subtitle, and FontAwesome layered icon composition
- **FR-002**: System MUST check for badge unlocks after each session completion when XP is awarded
- **FR-003**: System MUST persist earned badges (id + unlock timestamp) in ProgressData
- **FR-004**: System MUST display a toast notification on badge unlock showing icon, name, and subtitle
- **FR-005**: System MUST trigger a confetti celebration on badge unlock, respecting `prefers-reduced-motion`
- **FR-006**: System MUST render a badge gallery on the stats page showing all 15 badges (locked + unlocked states)
- **FR-007**: System MUST display the user's current badge (highest earned) next to the XP bar on the main page
- **FR-008**: System MUST handle progress data migration — retroactively award badges to existing users based on current level
- **FR-009**: Badge gallery and icons MUST NOT add render cost to the typing hot path (stats-only rendering)
- **FR-010**: All badge icon components MUST be memoised to avoid unnecessary re-renders

### Key Entities

- **BadgeDefinition**: Static config — id, name, subtitle, level threshold, icon layers (FA classes + transforms)
- **BadgeProgress**: Per-user persisted state — badge id + ISO unlock timestamp
- **BadgeIconLayer**: Individual FA layer within a badge — icon class, transform string, colour, opacity

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 15 badges are visible in the gallery and correctly show locked/unlocked state
- **SC-002**: Badge unlock fires within the same render cycle as XP update (no perceptible delay)
- **SC-003**: Toast + confetti appears on unlock and completes within 3 seconds
- **SC-004**: Current badge updates in XP bar immediately after session completion
- **SC-005**: Existing users with progress data see retroactively-awarded badges on first load after update
- **SC-006**: No measurable impact on typing input latency (badge logic runs post-session only)

## Assumptions

- FontAwesome 6 Free (already installed) covers all required icons; Pro-only icons substituted with documented Free alternatives
- Confetti uses a lightweight CSS/canvas approach (no heavy library) — existing `canvas-confetti` or inline CSS keyframes
- The XP level thresholds follow the existing `getLevelFromXp()` function — badges map 1:1 to levels 1-15
- Badge gallery is a new section on the existing `/stats` page, not a separate route
- Toast notification reuses the existing achievement toast pattern (4-second auto-dismiss)
