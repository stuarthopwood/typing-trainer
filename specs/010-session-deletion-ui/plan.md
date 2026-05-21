# Implementation Plan: Session Deletion UI

**Branch**: `010-session-deletion-ui` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)

## Summary

Add a delete button to each session row on the stats page. Deletion uses an optimistic-UI + 5-second undo toast pattern: the row vanishes immediately, and the actual remote/local deletion is deferred until the undo window expires. No confirmation modal, no soft-delete — KISS.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19

**Primary Dependencies**: Next.js 16 App Router, existing `DELETE /api/sessions?id=` endpoint, existing `deleteSession()` in `lib/sessions.ts`

**Storage**: Vercel Blob (remote, already handled by API), localStorage (local progress)

**Testing**: Vitest + Testing Library, BDD-style

**Target Platform**: Browser (desktop + mobile 375px+)

**Performance Goals**: Delete action feels instant (optimistic), undo restores in <100ms

**Constraints**: Keyboard-only operation required (Constitution). Tap targets ≥44px. Dark-first.

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero-Latency Keystrokes | PASS | Feature is on stats page only — no interaction with the typing hot path. |
| II. BDD-Style Testing | PASS | Tests for delete flow, undo, failure recovery, and a11y. |
| IV. SOLID, KISS, YAGNI | PASS | No soft-delete, no archive, no confirmation modal. Single undo-toast component. |
| V. Backendless by Default | PASS | Uses existing Blob API route. No new infrastructure. |
| VI. Dark-First, Mobile-Friendly | PASS | Toast and delete button designed for dark mode, ≥44px targets. |

## Project Structure

### Source Code Changes

```text
app/stats/page.tsx              # Modified: add delete button to session rows, undo toast state
components/UndoToast.tsx         # NEW: reusable undo-toast component
lib/progress.ts                  # Modified: add recalculateProgress() helper
tests/sessions.test.ts           # Modified: add delete-flow BDD tests
```

### Design Decisions

- **Undo toast vs confirmation modal**: Toast is less disruptive, faster for power users, and recoverable. Modals interrupt flow and require explicit dismiss.
- **Optimistic removal**: Row vanishes immediately for perceived speed. Actual deletion deferred 5s. If undo is pressed or API fails, row is restored.
- **Multiple deletes**: Each delete gets its own toast (stacked, most recent on top). Independent timers. Undo only reverses the specific delete.
- **Stats recalculation**: After commit, recalculate from remaining `recentSessions` in localStorage. The server-side `DELETE /api/sessions` already handles Blob-side recalculation.
- **Legacy sessions (no UUID)**: Delete button not rendered. Simple conditional in JSX.
