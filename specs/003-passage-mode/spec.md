# Feature Specification: Passage Mode

**Feature Branch**: `003-passage-mode`

**Created**: 2026-05-20

**Status**: Backfilled (describes shipped behavior as of v1.2.0)

**Input**: Retroactive spec for typing curated real-world text snippets (book/movie/code/quote) instead of generated drill text.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Type a curated passage to practice real-world text (Priority: P1)

A learner switches to passage mode and types through a real excerpt — e.g.,
a quote, a movie line, a code snippet — to practice typing natural text with
punctuation, capitals, and varied vocabulary instead of synthetic drill
words.

**Why this priority**: drills build muscle memory; passages transfer that to
realistic typing. Both are needed for the product to feel complete.

**Independent Test**: switch to passage mode, complete a passage; the typed
text MUST exactly match the source passage; on completion the next passage
loads automatically.

**Acceptance Scenarios**:

1. **Given** passage mode is selected, **When** the page loads, **Then** a
   passage is displayed with its source attribution visible (e.g.,
   "— Frank Herbert, Dune").
2. **Given** the user finishes a passage, **When** completion fires, **Then**
   a new passage loads automatically without manual navigation.
3. **Given** the active passage contains uppercase letters and punctuation,
   **When** the user types, **Then** Shift-modified keystrokes register
   correctly and punctuation must match exactly.

### User Story 2 - Browse passages by category (Priority: P3)

A learner can filter passages by category (`book`, `movie`, `code`, `quote`)
to practice specific content types.

**Why this priority**: nice-to-have content discovery; not required for the
core loop.

**Acceptance Scenarios**:

1. **Given** passages of multiple categories exist, **When** the user
   selects category `code`, **Then** subsequent passages drawn from the
   bank are all `code` category.

### Edge Cases

- A passage contains a Unicode character outside the keyboard layout
  (e.g., `—` em dash) — the engine MUST gracefully handle the keystroke
  expectation (either skip past it on the next visible input, or accept the
  ASCII fallback `--`). The shipped behavior treats em dash as expected
  char and accepts only the literal char.
- Passage list is empty for a chosen category — the UI MUST fall back to
  any-category random rather than locking the user out.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ship a curated passage bank with `book`, `movie`,
  `code`, and `quote` categories, each entry having `id`, `text`, `source`,
  `category`, `difficulty`.
- **FR-002**: System MUST display passage source attribution alongside the
  text.
- **FR-003**: System MUST auto-load a new passage on completion of the
  current one.
- **FR-004**: Passage text generation MUST NOT apply drill-mode adaptive
  targeting (passages are immutable source content).
- **FR-005**: System MUST allow filtering passages by category; an empty
  category result MUST fall back to any-category.

### Key Entities

- **Passage**: `{ id, text, source, category, difficulty }`. `category` ∈
  {`book`, `movie`, `code`, `quote`}, `difficulty` ∈ {`beginner`,
  `intermediate`, `advanced`}.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of passages display their `source` attribution in the UI.
- **SC-002**: Passage bank includes ≥10 entries per category.
- **SC-003**: 0 crashes when the user completes 50 sequential passages
  (auto-load works repeatedly).

## Assumptions

- Passages are static content shipped with the app; no CMS, no fetched
  content.
- Difficulty is currently informational only — passage selection is random
  within filters, not difficulty-graded by the user's current skill level.
