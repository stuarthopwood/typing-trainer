# Feature Specification: Zen Mode

**Feature Branch**: `011-zen-mode`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "Zen Mode — a third training mode where the user types freely on an AI-generated topic prompt with real-time spell-checking."

## User Scenarios & Testing

### User Story 1 — Free-Type on a Generated Topic (Priority: P1)

A user selects Zen Mode and receives an AI-generated topic prompt (e.g., "Describe your morning routine"). They type freely in response — no expected text to copy. The system tracks their typing speed and word count in real time. When they're satisfied with their response (minimum 20 words), they click Done to end the session.

**Why this priority**: This is the core interaction — without topic generation and free-typing, the mode doesn't exist.

**Independent Test**: Select Zen Mode → topic appears → type a 20+ word response → click Done → WPM and word count displayed in session summary.

**Acceptance Scenarios**:

1. **Given** a user selects Zen Mode and an AI key is configured, **When** the mode activates, **Then** an AI-generated topic prompt (5-10 words, open-ended question) is displayed above the typing area.
2. **Given** the topic is displayed, **When** the user types freely, **Then** the current line appears in large white text with previous lines fading into the background (2-3 visible lines above, progressively dimmer).
3. **Given** the user is typing, **When** they look below the typing window, **Then** a scrollable panel shows their complete response (replacing the visual keyboard), auto-scrolling to the latest content.
4. **Given** the user has typed fewer than 20 words, **When** they look at the Done button, **Then** it is disabled with a word-count indicator showing progress toward the minimum.
5. **Given** the user has typed 20+ words, **When** they click Done, **Then** the session ends and a summary is shown with WPM, time, word count, and spelling accuracy.
6. **Given** a user clicks "New Topic" while typing, **When** confirmed, **Then** the current session is cancelled (no data recorded), the text is cleared, and a fresh topic is generated.

---

### User Story 2 — Real-Time Spell-Checking (Priority: P2)

While the user types, misspelled words are detected and highlighted with a red underline. The spell-check fires in batches (after a 1.5-second typing pause or when 5 unchecked words accumulate) to provide near-real-time feedback without interrupting flow. Any words missed during typing are caught in a final check when the session ends.

**Why this priority**: Spelling feedback is the accuracy mechanism for Zen Mode — without it, there's no way to measure typing quality beyond raw speed.

**Independent Test**: Type "teh quikc brown fox" → after a brief pause, "teh" and "quikc" get red underlines → session summary shows 2 spelling errors.

**Acceptance Scenarios**:

1. **Given** the user has typed 5 words without pausing, **When** the 5th word is completed (space pressed), **Then** the batch of unchecked words is sent for spell-checking and results appear within 1 second.
2. **Given** the user pauses typing for 1.5 seconds, **When** there are unchecked words, **Then** those words are sent for spell-checking regardless of count.
3. **Given** a spell-check returns a word as misspelled, **When** the result arrives, **Then** that word receives a visible red underline in both the typing window and the response panel.
4. **Given** the spell-check service is unavailable or times out (3 seconds), **When** a batch fails, **Then** those words are marked as "unchecked" (no underline, no penalty) and re-checked at session end.
5. **Given** the user clicks Done, **When** there are unchecked words remaining, **Then** a final catch-up check runs before the session summary is calculated.
6. **Given** a session has completed all spell-checks, **When** the summary is shown, **Then** accuracy is calculated as: (correctly spelled words / total checked words) × 100%.

---

### User Story 3 — Session Recording & Progression (Priority: P3)

Zen sessions are recorded alongside drill and passage sessions but kept distinct in the stats system. They earn XP and count toward day streaks, but don't influence drill-level unlocks or the error heatmap.

**Why this priority**: Without proper recording and progression integration, zen sessions feel disconnected from the rest of the app.

**Independent Test**: Complete a zen session → verify it appears in Recent Sessions on the stats page with "zen" tag → verify XP was awarded → verify it did NOT affect drill level progress or error heatmap.

**Acceptance Scenarios**:

1. **Given** a zen session is completed, **When** the session is recorded, **Then** it awards XP (base 5 + accuracy bonus) and counts toward the day streak.
2. **Given** a zen session achieved 30+ WPM, **When** achievements are checked, **Then** WPM-based achievements can be unlocked (e.g., speed-30).
3. **Given** a zen session is completed, **When** drill level progress is checked, **Then** the zen session has NOT been counted toward any drill level unlock threshold.
4. **Given** a zen session has spelling errors, **When** the error heatmap is updated, **Then** zen spelling errors are NOT added to the keystroke error heatmap (different error type).
5. **Given** a user views the stats page, **When** bestWpm and bestAccuracy are displayed, **Then** zen sessions are excluded from those aggregate calculations.
6. **Given** a zen session is recorded, **When** it appears in the Recent Sessions list, **Then** it is tagged with the topic text and shows "zen" as the mode.

---

### User Story 4 — Mode Visibility & API Gating (Priority: P3)

Zen Mode is only visible when the AI integration is properly configured. If no API key is available, the mode is completely hidden — no broken UI, no error states.

**Why this priority**: Prevents confusion for users without AI configured, and keeps the app clean per the "degrade gracefully" principle.

**Independent Test**: Load the app without an API key configured → Zen Mode button does not appear in the mode selector.

**Acceptance Scenarios**:

1. **Given** no AI API key is configured, **When** the user views the mode selector, **Then** only Drill and Passage modes are shown (no Zen button).
2. **Given** an API key is configured, **When** the user views the mode selector, **Then** a third Zen Mode button appears alongside Drill and Passage.
3. **Given** Zen Mode is selected but topic generation fails, **When** the error occurs, **Then** a message is shown ("Couldn't generate topic — try again") with a retry button, rather than a broken state.

---

### Edge Cases

- What happens if the user types only spaces or punctuation? The word count should only count actual words (sequences of non-whitespace characters). The Done button stays disabled.
- What happens if the user types the same word repeatedly? Spell-check treats each occurrence independently — if it's correctly spelled, all occurrences are fine.
- What happens on very long sessions (500+ words)? The response panel handles scroll. No performance degradation expected since the overlay re-renders are word-level, not character-level.
- What happens if the user pastes text? Pasted text should be accepted (it's free-typing, not a test of keystroke speed). WPM calculation uses the time from first keystroke to Done click, which naturally penalises paste-and-wait strategies. Spell-check runs on all words regardless of how they were entered.
- What happens on mobile? The fixed-height typing window should work on 375px viewports. The response panel scrolls independently. The topic prompt wraps naturally.

## Requirements

### Functional Requirements

- **FR-001**: System MUST generate a short, open-ended topic prompt (5-10 words) when Zen Mode is activated or "New Topic" is pressed.
- **FR-002**: System MUST provide a fixed-height typing window showing the current line in large white text with 2-3 previous lines fading into the background.
- **FR-003**: System MUST display a scrollable response panel below the typing window (in place of the visual keyboard) showing the complete typed response.
- **FR-004**: System MUST track keystrokes for WPM and timing analytics during the session.
- **FR-005**: System MUST display live WPM, elapsed time, and word count during typing (no live accuracy, no combo counter).
- **FR-006**: System MUST batch spell-check words using AI, triggered by either a 1.5-second typing pause or 5 unchecked words accumulating (whichever comes first).
- **FR-007**: System MUST visually mark misspelled words with a red underline in both the typing window and response panel.
- **FR-008**: System MUST perform a final catch-up spell-check on all unchecked words when the user clicks Done.
- **FR-009**: System MUST enable the Done button only after 20+ words have been typed.
- **FR-010**: System MUST cancel the current session (no data recorded) when "New Topic" is pressed mid-session.
- **FR-011**: System MUST hide Zen Mode entirely from the mode selector when no AI API key is configured.
- **FR-012**: System MUST record zen sessions with XP, streak counting, and WPM/accuracy achievements, but MUST NOT include them in drill level progress, error heatmap, or bestWpm/bestAccuracy aggregates.
- **FR-013**: System MUST suppress password manager autofill on the typing input.
- **FR-014**: System MUST gracefully handle spell-check timeouts (3 seconds) by leaving words unchecked until the final pass.

### Key Entities

- **Topic Prompt**: An AI-generated open-ended question (5-10 words) that inspires the user to write.
- **Zen Session**: A free-typing session with no expected text, where accuracy is measured by spelling correctness rather than positional character matching.
- **Spell-Check Batch**: A group of 1-5 words sent together for AI-based spelling validation, triggered by pause or word-count threshold.
- **Response Panel**: A scrollable display of the user's complete typed response, positioned below the typing window.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can start typing within 2 seconds of selecting Zen Mode (topic generation latency).
- **SC-002**: Spell-check results appear within 1 second of triggering for 95%+ of batches.
- **SC-003**: Typing feels uninterrupted — no visible jitter or input lag during spell-check network calls.
- **SC-004**: Session summary shows accurate WPM (within 1 WPM of manual calculation) and correct spelling-error count.
- **SC-005**: The entire zen flow (select mode → type → Done → summary) is completable via keyboard alone.
- **SC-006**: Zen sessions are correctly excluded from drill/passage aggregate statistics.

## Assumptions

- The existing Anthropic API integration pattern (server-side route with `ANTHROPIC_API_KEY`) is reused for both topic generation and spell-checking.
- The AI model (Claude Haiku) is sufficiently fast for near-real-time spell-checking (~200-400ms per batch).
- Users understand that Zen Mode measures a different skill (composition + spelling) than drill/passage modes (transcription accuracy + speed). No in-app explanation is provided beyond the mode name and visual distinction.
- Mobile users can use Zen Mode on 375px+ viewports, though the experience is optimised for desktop (full keyboard).
- The 20-word minimum is sufficient to generate meaningful WPM and accuracy metrics. Sessions shorter than this are not worth recording.
- Paste is allowed — WPM naturally reflects the time spent, and spell-check catches errors regardless of input method.
