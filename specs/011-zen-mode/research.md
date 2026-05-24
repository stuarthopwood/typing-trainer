# Research: Zen Mode

## R1: Textarea + Overlay Pattern for Styled Text Input

**Decision**: Use an invisible `<textarea>` for native text input handling, with a visible `<div>` overlay that mirrors the content and applies word-level styling (red underlines for misspellings).

**Rationale**: A textarea gives us free cursor movement, native undo, IME support, word-wrap, and paste handling — all without custom keydown interception. The overlay div renders the same text with `<span>` wrappers per word for styling. The two are kept in sync via the textarea's `onInput` event.

**Alternatives considered**:
- `contentEditable` div — richer inline styling but notoriously buggy (cursor jumping, undo stack issues, cross-browser inconsistencies). Not worth the complexity.
- Custom keydown interception (like TypingArea) — unnecessary since there's no expected text to compare against. Would re-implement browser text editing badly.

## R2: Hybrid Batch Spell-Check Triggering

**Decision**: Fire spell-check when EITHER 1.5 seconds of no typing passes OR 5 unchecked words accumulate, whichever comes first. 3-second timeout per batch.

**Rationale**: Pure on-space (per-word) is too chatty (50 API calls per session). Pure time-based misses fast typists who never pause. The hybrid guarantees feedback every ~5 words for fast typists and every pause for slow typists.

**Alternatives considered**:
- Per-word on space — 50 calls/session, poor context (single word), unnecessary API load.
- Fixed interval (every 3s) — underlines appear in unpredictable bursts unrelated to typing rhythm.
- Session-end only — no real-time feedback, misses the point of interactive spell-check.

## R3: Spell-Check API Prompt Design

**Decision**: Send the batch of words with 2-3 words of surrounding context. Prompt asks for JSON array of misspelled words with suggestions.

**Rationale**: Context is essential for homophones ("their/there/they're", "its/it's"). Sending isolated words would miss these. The surrounding context gives the model enough to disambiguate.

**Prompt structure**:
```
Check these words for spelling errors. Context: "[previous 3 words] [WORD1] [WORD2] [WORD3] [next 3 words]"
Return ONLY a JSON array of objects for misspelled words: [{"word":"misspeled","index":0,"suggestion":"misspelled"}]
Return empty array [] if all words are correctly spelled.
```

## R4: Fading Lines Visual Approach

**Decision**: CSS opacity gradient on the overlay div's line elements. Current line = opacity 1.0, line-1 = 0.6, line-2 = 0.3, line-3+ = 0.15. The "window" is a fixed-height container with overflow hidden, auto-scrolled to keep the current line at the bottom.

**Rationale**: Pure CSS approach, no per-frame JS calculations. The overlay div wraps text naturally (same font/size as textarea), so line positions match. Auto-scroll via `scrollTop = scrollHeight - clientHeight` on input.

**Alternatives considered**:
- Canvas rendering — overkill, loses text selectability.
- Per-character opacity (like TypingArea's Char components) — unnecessary granularity for free-typing where position isn't tracked.

## R5: Session Stats for Zen Mode

**Decision**: 
- WPM = (total chars / 5) / (duration in minutes). All chars count (correctly spelled or not).
- Accuracy = (correctly spelled words / total checked words) × 100%.
- Words that timed out and weren't caught in the final pass are excluded from accuracy denominator.

**Rationale**: WPM measures typing speed regardless of spelling. Accuracy measures spelling knowledge. These are independent metrics — you can type fast AND misspell, or type slow AND spell perfectly.

**Alternatives considered**:
- Subtract misspelled-word chars from "correct chars" for WPM — unfairly penalises fast typists who make occasional spelling errors. WPM should be pure speed.
- Count unchecked words as correct — would inflate accuracy when API is slow. Better to exclude them.
