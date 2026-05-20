# Feature Specification: Visual Keyboard (Active Key + Heatmap Overlay)

**Feature Branch**: `008-visual-keyboard`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for the on-screen keyboard that highlights the
currently pressed key and overlays the cumulative error heatmap.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualize the active keystroke (Priority: P2)

While typing, the on-screen keyboard highlights the key that the user
just pressed, color-coded by correctness (green for correct, red for
incorrect). This helps the learner build muscle-memory association
between physical key locations and the on-screen layout.

**Why this priority**: helpful for new typists; the typing surface still
works without it.

**Independent Test**: type a sequence of keys; for each key, the matching
visual key MUST briefly highlight and revert.

**Acceptance Scenarios**:

1. **Given** the visual keyboard is rendered, **When** the user presses
   `f` correctly, **Then** the `f` key on the visual keyboard flashes in
   the correct-color state.
2. **Given** the visual keyboard is rendered, **When** the user presses
   `g` while `f` was expected, **Then** the `g` key flashes in the
   incorrect-color state.

### User Story 2 - See cumulative error heatmap on the keyboard (Priority: P2)

The on-screen keyboard tints each key by the cumulative error count from
`progress.errorHeatmap`. Hot keys (frequent error sites) appear red; cold
keys appear neutral.

**Why this priority**: at-a-glance diagnosis of weak spots — supports the
adaptive drill targeting feature.

**Acceptance Scenarios**:

1. **Given** the user has 30 cumulative errors on `t`, 5 on `r`, and 0 on
   `q`, **When** the keyboard heatmap renders, **Then** `t` is the most
   intensely tinted key, `r` lighter, `q` neutral.
2. **Given** the heatmap is empty (fresh profile), **When** the keyboard
   renders, **Then** all keys appear in the neutral baseline state.

### User Story 3 - Render correctly on mobile widths (Priority: P3)

The visual keyboard MUST scale down to fit a 375 px viewport without
overflowing or breaking layout.

**Why this priority**: mobile usability per Constitution Principle VI.

**Acceptance Scenarios**:

1. **Given** a 375 px viewport, **When** the visual keyboard renders,
   **Then** all keys are visible without horizontal scroll and tap
   targets remain ≥ 44 px in their largest dimension or are intentionally
   informational-only.

### Edge Cases

- The user presses a key not in the visible layout (e.g., a non-Latin
  layout key) — the keyboard renders nothing for that keystroke and does
  not crash.
- Active-key highlight overlaps with heatmap tint — active-key state MUST
  visibly dominate (the heatmap is a background hint, not a foreground
  signal).
- A key is highlighted at session end — the highlight MUST clear when
  the session ends to avoid confusing carry-over.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render an on-screen QWERTY keyboard
  (`VisualKeyboard` component) that visually highlights the active key
  on each keystroke, distinguishing correct vs incorrect.
- **FR-002**: System MUST overlay `progress.errorHeatmap` as a per-key
  tint (`KeyboardHeatmap` component on `/stats`, and equivalent inline
  on the typing surface).
- **FR-003**: Active-key highlight MUST take visual precedence over
  heatmap tint.
- **FR-004**: Visual keyboard updates MUST NOT introduce keystroke
  latency (it MUST share the memoized active-key state, not subscribe
  to the keystroke buffer).
- **FR-005**: Visual keyboard MUST fit a 375 px viewport without
  overflow.
- **FR-006**: Active-key highlight MUST clear when a session ends or the
  user navigates away.

### Key Entities

- **ActiveKeyState**: `{ key, code, correct, timestamp }` — last
  observed keystroke, used by the visual keyboard.
- **errorHeatmap**: `Record<char, count>` — provided by progress.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Active-key highlight latency matches keystroke-to-paint
  budget (p95 < 16 ms).
- **SC-002**: At 375 px viewport, no horizontal scroll appears on the
  page when the visual keyboard is rendered.
- **SC-003**: Heatmap tint intensity correlates monotonically with
  cumulative error count (verified by snapshot/visual test).

## Assumptions

- QWERTY US layout only for v1.x.
- The visual keyboard is decorative for muscle-memory training; it is
  NOT an input method (no clicking on-screen keys to type).
