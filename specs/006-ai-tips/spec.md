# Feature Specification: AI Tips (Claude-Powered Coaching)

**Feature Branch**: `006-ai-tips`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for the AI coaching feature: detect typing error patterns, ask Claude (Haiku) for human-readable tips, surface them in the TipBox UI.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get a coaching tip after a session (Priority: P1)

A learner completes a session; the app analyzes their keystrokes for error
patterns (shallow activations, slipped fingers, burst error contexts, slow
bigrams) and surfaces a short, plain-English coaching tip. The tip is
written by Claude Haiku from a structured summary of the session.

**Why this priority**: turns analytics into human-readable guidance — the
single biggest differentiator vs. generic typing tests.

**Independent Test**: complete a session with deliberate errors on a
specific finger pattern, watch the tip box — within a few seconds the box
MUST render a tip referencing the actual error pattern (not a generic
fortune-cookie message).

**Acceptance Scenarios**:

1. **Given** a session with multiple errors on `r` (slipped finger from
   `t`), **When** the tip is generated, **Then** the rendered tip
   references the specific key/pattern (e.g., "your right index slips from
   `t` to `r`").
2. **Given** the API call returns valid JSON, **When** the tip box
   renders, **Then** it shows formatted prose, not raw JSON.
3. **Given** the user provides their Anthropic API key in settings,
   **When** sessions are completed, **Then** tips use that key.

### User Story 2 - Tips persist and rotate (Priority: P2)

Generated tips are appended to `progress.tips` so the learner can see a
short history of past coaching, and the most recent tip is the default
display.

**Why this priority**: lets the learner reflect on what they've been told
and notice repetition in their patterns.

**Acceptance Scenarios**:

1. **Given** 5 sessions completed, **When** the tip history is opened,
   **Then** up to the most recent N tips are listed in reverse
   chronological order.

### User Story 3 - Graceful degradation without an API key (Priority: P1)

If no Anthropic API key is configured, the app MUST still function: the
tip box hides or shows a "configure your API key" CTA; sessions and stats
work normally.

**Why this priority**: API access is optional; the app is usable
without it.

**Acceptance Scenarios**:

1. **Given** no API key is configured, **When** a session completes,
   **Then** no tip is generated; no error toast blocks the user; the tip
   box either hides or shows a configure-CTA.
2. **Given** the API call fails (network, rate limit, invalid key),
   **When** the failure is observed, **Then** the previous tip remains
   visible (or empty state renders) and no error blocks the typing UI.

### Edge Cases

- API returns malformed JSON — parse failure MUST be caught; a fallback
  message ("couldn't parse tip") is acceptable; raw JSON MUST NOT leak
  into the UI.
- API returns a tip referencing a key the user did not actually struggle
  with — accepted (the model's choice; the structured input bounds it).
- The user's profile has no detected error patterns (clean session) — the
  app MAY skip the API call entirely or request a "general encouragement"
  tip; no crash either way.
- Rate limit hit — surface no error to the user; the tip from the prior
  session remains.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST analyze the most recent session's keystrokes to
  detect error patterns: shallow activations, slipped fingers, burst error
  contexts.
- **FR-002**: System MUST call Anthropic Claude (Haiku model) via
  `POST /api/tips` with a structured summary of the session and patterns.
- **FR-003**: The `/api/tips` route MUST forward the request to Anthropic
  using a user-supplied API key (passed via header from the client) or a
  server-configured fallback key — the codebase MUST NOT bundle a key.
- **FR-004**: System MUST parse the model response, extract the tip text,
  and store it in `progress.tips` as a string (not raw JSON).
- **FR-005**: System MUST render the most recent tip in the TipBox
  component as formatted prose.
- **FR-006**: System MUST gracefully handle missing API key, network
  failures, malformed responses, and rate limits — no error MUST block
  typing or session recording.
- **FR-007**: System MUST persist tip history (most recent N tips) to
  `progress.tips` and include them in Blob sync.

### Key Entities

- **ErrorPattern**: detected pattern type + supporting evidence (chars,
  bigrams, contexts) — input to the model.
- **Tip**: a short string of coaching prose stored in `progress.tips`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of API failure modes (no key, malformed, network down)
  result in zero crashes and zero blocking error toasts.
- **SC-002**: 0% of UI tip renders show raw JSON to the user.
- **SC-003**: Tip generation latency does NOT delay the next drill — tips
  resolve asynchronously after session save.
- **SC-004**: When patterns are detected, ≥80% of generated tips reference
  the actual detected key/pattern (judged by inspection of test fixtures).

## Assumptions

- Anthropic Haiku is the chosen model for cost/speed tradeoff; the model
  ID can change without amendment.
- The user-supplied API key is stored client-side in `localStorage` and
  forwarded per request; no server-side key vault.
- Tips are advisory; no automated action is taken in response to a tip.
