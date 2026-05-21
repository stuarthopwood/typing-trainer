# Feature Specification: Session Deletion UI

**Feature Branch**: `010-session-deletion-ui`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "Session deletion UI — add a delete button to each session row on the stats page's Recent Sessions list. Tapping delete removes the session from Blob storage (via the existing DELETE /api/sessions?id= endpoint) and from localStorage, then recomputes aggregated stats. Design considerations: confirmation before delete, optional undo window, hard-delete only, optimistic UI update."

## User Scenarios & Testing

### User Story 1 — Delete a Session with Undo (Priority: P1)

A user viewing their stats notices a session they want to remove (e.g., someone else used their PIN, or a session was abandoned/accidental). They tap delete, the row vanishes immediately, and an undo toast appears for 5 seconds. If they don't undo, the session is permanently removed from both local and remote storage.

**Why this priority**: Core interaction — this is the entire feature. Without the undo-based delete flow, nothing else makes sense.

**Independent Test**: On the stats page, tap delete on a session row → row disappears instantly, undo toast shows for 5 seconds → wait → session is gone from both localStorage and Blob.

**Acceptance Scenarios**:

1. **Given** a session row is visible in the Recent Sessions list, **When** the user taps the delete button, **Then** the row is removed from the list immediately (optimistic) and an undo toast appears at the bottom of the screen with a 5-second countdown.
2. **Given** the undo toast is visible, **When** the user taps "Undo" within 5 seconds, **Then** the session row is restored to its original position in the list and no remote deletion occurs.
3. **Given** the undo toast is visible, **When** 5 seconds elapse without the user pressing Undo, **Then** the session is permanently deleted from remote storage and localStorage, and aggregated stats (totalSessions, bestWpm, bestAccuracy, totalCharsTyped) are recalculated.
4. **Given** the remote deletion fails (network error, server error), **When** the undo window expires, **Then** the session row is restored to the list and an error toast is shown explaining the failure.

---

### User Story 2 — Stats Recalculation After Deletion (Priority: P2)

After a session is permanently deleted, the aggregated stats on the stats page and in localStorage must reflect the removal — particularly if the deleted session held a personal record.

**Why this priority**: Without recalculation, deletion creates data inconsistency. This is the data-integrity complement to US1.

**Independent Test**: Delete the session that holds the user's bestWpm → after undo window expires → bestWpm on the dashboard updates to the next-highest session's WPM.

**Acceptance Scenarios**:

1. **Given** a session with the user's best WPM (18) is deleted, **When** the deletion is committed, **Then** bestWpm is recalculated from remaining sessions (e.g., drops to 17) and the stats header reflects the new value.
2. **Given** a session is deleted, **When** the deletion is committed, **Then** totalSessions decrements by 1 and totalCharsTyped is reduced by the deleted session's charsTyped.
3. **Given** the deleted session was the only qualifying session for a level unlock (drill:top-row qualifying count drops below threshold), **When** the deletion is committed, **Then** the level is re-locked and the user is informed.

---

### User Story 3 — Keyboard Accessibility for Delete Action (Priority: P3)

The delete button must be operable via keyboard (Tab to focus, Enter/Space to activate) and must announce its purpose to screen readers.

**Why this priority**: Constitution mandates keyboard-only operation for all interactive flows. Delete is destructive — it MUST be deliberate and accessible.

**Independent Test**: Tab through the Recent Sessions list → delete button receives visible focus → press Enter → undo toast appears and is announced by screen reader.

**Acceptance Scenarios**:

1. **Given** a keyboard-only user navigating the stats page, **When** they Tab through the Recent Sessions list, **Then** each delete button is focusable with a visible focus ring.
2. **Given** a screen reader user, **When** the delete button is focused, **Then** it announces "Delete session from [date] — [wpm] WPM" (or equivalent descriptive label).
3. **Given** the undo toast appears, **When** the user presses Tab, **Then** the Undo button receives focus and is activatable via Enter/Space.

---

### Edge Cases

- What happens when the user deletes multiple sessions in rapid succession? Each gets its own undo toast (stacked or replacing the previous), and each has an independent 5-second timer.
- What happens when the session being deleted has no UUID (legacy pre-UUID sessions)? The delete button is not shown for those rows (they can only be removed by clearing all data).
- What happens when the user is offline? Optimistic removal still happens locally; remote deletion is queued and retried on next sync. If retry fails, an error is surfaced.
- What happens when the stats page is loading sessions and a delete is triggered? The delete waits for loading to complete before executing.

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a delete affordance (button/icon) on each session row that has a valid session ID.
- **FR-002**: System MUST remove the session row from the UI immediately on delete (optimistic update).
- **FR-003**: System MUST show an undo toast for 5 seconds after delete, allowing the user to reverse the action.
- **FR-004**: System MUST permanently delete the session from remote storage only after the undo window expires without user intervention.
- **FR-005**: System MUST remove the session from localStorage and recalculate aggregated stats (totalSessions, bestWpm, bestAccuracy, totalCharsTyped) after permanent deletion.
- **FR-006**: System MUST restore the session row if the user taps Undo or if the remote deletion fails.
- **FR-007**: System MUST NOT show the delete button for sessions without a valid ID (legacy sessions).
- **FR-008**: System MUST make the delete button and undo toast fully keyboard-operable and screen-reader-accessible.

### Key Entities

- **Session Row**: A visual row in the Recent Sessions list, representing one `EnrichedSessionSummary`. Contains date, mode, duration, WPM, accuracy, and (new) a delete button.
- **Undo Toast**: A temporary notification with a countdown and an Undo button. Appears at the bottom of the stats page. Auto-dismisses after 5 seconds.
- **Aggregated Stats**: The `ProgressData` object in localStorage (totalSessions, bestWpm, bestAccuracy, totalCharsTyped, levelProgress).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can delete a session and undo within 5 seconds with no data loss.
- **SC-002**: After permanent deletion, aggregated stats are consistent with remaining sessions within 1 second.
- **SC-003**: The entire delete → undo → confirm flow is completable via keyboard alone.
- **SC-004**: Accidental deletions are recoverable 100% of the time within the undo window.
- **SC-005**: The delete action completes (or fails with clear feedback) within 3 seconds of the undo window expiring.

## Assumptions

- The existing `DELETE /api/sessions?id=` endpoint handles remote deletion and progress recalculation. No new server-side work is needed.
- Hard-delete only — no soft-delete, no trash/archive concept. Keeps the system simple per YAGNI.
- The undo window is purely client-side (a timeout). The server is not aware of pending deletes.
- Multiple rapid deletes stack independent undo toasts (most recent on top). If this proves visually noisy, it can be refined later — but the first implementation should handle the multi-delete case correctly.
- Sessions without a UUID (4 legacy sessions from early days) cannot be individually deleted. The delete button is simply absent for those rows.
