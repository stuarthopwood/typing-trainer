# Feature Specification: Streak Calendar

**Feature Branch**: `013-streak-calendar`
**Created**: 2026-05-22
**Status**: Draft

## User Scenarios & Testing

### User Story 1 - Activity Heatmap (Priority: P1)

GitHub-style contribution grid showing the last 12 months of typing practice. Cell intensity reflects daily session count.

**Acceptance Scenarios**:

1. **Given** a user with sessions on various days, **When** viewing stats page, **Then** a 52x7 grid renders with cells coloured by session count (0=empty, 1=dim, 2-3=medium, 4+=bright)
2. **Given** a cell is hovered, **When** tooltip appears, **Then** it shows "May 22, 2026 — 3 sessions (42 WPM avg)"
3. **Given** mobile viewport (<640px), **When** calendar renders, **Then** it scrolls horizontally or shows last 3 months

---

### User Story 2 - Streak Display (Priority: P2)

Current streak and longest streak displayed prominently alongside the calendar.

**Acceptance Scenarios**:

1. **Given** a user with 12 consecutive days of practice, **When** viewing stats, **Then** "12 days" current streak shown with fire icon
2. **Given** a user whose longest streak is 34 days, **When** viewing stats, **Then** "Best: 34 days" shown as secondary stat
3. **Given** a user who missed yesterday, **When** viewing today, **Then** current streak resets to 0 (or 1 if they've already practised today)

---

### Edge Cases

- User with no sessions: empty grid, 0 streak
- Timezone handling: use local midnight boundaries
- Sessions spanning midnight: count for the day they started

## Requirements

- **FR-001**: System MUST render a 52-week x 7-day grid for last 12 months
- **FR-002**: System MUST colour cells by intensity (0, 1, 2-3, 4+ sessions)
- **FR-003**: System MUST show hover tooltip with date + count + avg WPM
- **FR-004**: System MUST compute current streak (consecutive days with ≥1 session)
- **FR-005**: System MUST compute longest streak from all session history
- **FR-006**: Calendar MUST be responsive (horizontal scroll on mobile)
- **FR-007**: Colours MUST pass WCAG AA contrast against dark background

## Success Criteria

- **SC-001**: Calendar renders within 100ms from session data
- **SC-002**: Streaks calculate correctly across timezone boundaries
- **SC-003**: Mobile users can view full calendar via horizontal scroll
