# Implementation Plan: Zen Mode

**Branch**: `011-zen-mode` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)

## Summary

Third training mode: free-type on an AI-generated topic. New ZenTypingArea component (textarea + overlay) with fixed-height fading-lines window. Hybrid batch spell-check (1.5s pause OR 5 words) via Anthropic Haiku. Session ends on manual Done button (20+ words). Mode hidden when API key unconfigured.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Node 24 LTS

**Primary Dependencies**: Next.js 16 (App Router), @anthropic-ai/sdk, @vercel/blob

**Storage**: localStorage (primary) + Vercel Blob (session blobs via existing /api/sessions infrastructure)

**Testing**: Vitest + Testing Library, BDD-style

**Target Platform**: Browser (desktop + mobile 375px+), Vercel Fluid Compute

**Performance Goals**: Topic generation <2s, spell-check batch <1s, zero typing latency (no blocking in keystroke handler)

**Constraints**: No new infrastructure. Reuse existing Anthropic SDK pattern. Keyboard-only operation. Dark-first. Must degrade (hide mode) when API key absent.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero-Latency | PASS | New component — doesn't touch TypingArea hot path. Textarea handles input natively. Spell-check is async/non-blocking. |
| II. BDD Testing | PASS | Tests for topic generation, spell-check batching, session recording, mode gating. |
| IV. SOLID/KISS | PASS | Separate ZenTypingArea (not extending TypingArea). Separate API routes. Single-responsibility lib/zen.ts. |
| V. Backendless | PASS | Anthropic API only (existing pattern). Mode hidden when unconfigured. Graceful degradation. |
| VI. Dark-First | PASS | All new UI designed for dark mode. 375px viewport. 44px tap targets. |

No violations.

## Project Structure

### Source Code

```
app/
├── api/
│   ├── zen-topic/route.ts       # NEW — generate topic prompt
│   └── zen-spellcheck/route.ts  # NEW — batch spell-check words
├── page.tsx                     # Modified — add zen state, mode routing, session handling

components/
├── ZenTypingArea.tsx            # NEW — textarea + overlay, keystroke tracking, fading lines
├── ZenResponsePanel.tsx         # NEW — scrollable full-response display
├── ModeSelector.tsx             # Modified — third button, zen topic UI

lib/
├── zen.ts                       # NEW — topic fetching, spell-check client, zen stats builder
├── types.ts                     # Modified — add "zen" to TrainingMode, topic to modeDetails
├── progress.ts                  # Modified — exclude zen from drill aggregates
├── achievements.ts              # Modified — allow WPM/accuracy achievements for zen

tests/
├── zen.test.ts                  # NEW — topic gen, spell-check, session stats, mode gating
```

### Design Decisions

- **Textarea + overlay** for ZenTypingArea (not contentEditable or window-keydown interception). Native text editing, styled overlay for misspelling underlines.
- **Password-manager suppression**: `autoComplete="off"`, `data-1p-ignore`, `data-lpignore="true"`, `data-form-type="other"`, `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`.
- **Fixed-height typing window**: ~4 lines visible. Current line white, previous lines fade (opacity 60% → 30% → 15%). Text scrolls up as user types.
- **Response panel**: replaces VisualKeyboard when `mode === "zen"`. Full response, scrollable, auto-scrolls to bottom.
- **Hybrid batch spell-check**: 1.5s pause OR 5 unchecked words. Final catch-up on Done. 3s timeout per batch = skip.
- **WPM during typing, accuracy at session end only**. No combo counter in zen.
- **Mode hidden entirely when `NEXT_PUBLIC_PROGRESS_API_KEY` is absent** (topic gen and spell-check both require API).
