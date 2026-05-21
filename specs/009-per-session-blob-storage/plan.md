# Implementation Plan: Per-Session Blob Storage

**Branch**: `009-per-session-blob-storage` | **Date**: 2026-05-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-per-session-blob-storage/spec.md`

## Summary

Store each completed typing session as an individual Vercel Blob at `neuralkeys/sessions/{pin}/{session-id}.json`, enabling granular fetch/delete/list operations. The aggregated `progress-{pin}.json` remains as a lightweight summary (stripped of the growing `allSessions` array). The stats page aggregates from individual session blobs. Legacy `allSessions` data is migrated to individual blobs on first access.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 24 LTS

**Primary Dependencies**: Next.js 16 (App Router), @vercel/blob 2.x, React 19

**Storage**: Vercel Blob (public, PIN-scoped paths). localStorage for local state.

**Testing**: Vitest + Testing Library, BDD-style (Constitution Principle II)

**Target Platform**: Vercel (Fluid Compute), browser (static Next.js export-friendly)

**Project Type**: Web application (backendless typing trainer)

**Performance Goals**: Session fetch < 500ms, stats page load < 3s for 100+ sessions, progress blob < 10KB

**Constraints**: No backend beyond Vercel edge functions. No auth server — PIN-scoped isolation only. Must degrade gracefully when offline (localStorage is source of truth).

**Scale/Scope**: Single user per PIN, hundreds of sessions per user (not millions). Blob list API supports prefix-based pagination.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Zero-Latency Keystrokes | PASS | Session blob write happens AFTER session completion via `syncToRemote` — zero work in the keystroke hot path. |
| II. BDD-Style Testing | PASS | All new functions will have Given/When/Then tests. Coverage ≥80% on touched `lib/**` files. |
| IV. SOLID, KISS, YAGNI | PASS | Single-responsibility: session write, session list, session delete are separate functions. No speculative abstractions. |
| V. Backendless by Default | PASS | Vercel Blob only. No databases, no auth servers. localStorage remains primary; Blob is backup. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-per-session-blob-storage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API endpoint contracts)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── api/
│   ├── progress/
│   │   └── route.ts        # Modified: remove allSessions from PUT, write session blob
│   └── sessions/
│       └── route.ts        # NEW: list, fetch, delete individual sessions
├── page.tsx                # Modified: pass session to syncToRemote for individual storage
└── stats/
    └── page.tsx            # Modified: load from session blobs via new API

lib/
├── progress.ts             # Modified: syncToRemote writes session blob; strip allSessions from PUT payload
└── sessions.ts             # NEW: client-side helpers (loadAllSessions, deleteSession)

tests/
├── sessions.test.ts        # NEW: BDD tests for session CRUD + migration
└── progress.test.ts        # Modified: update sync tests
```

**Structure Decision**: Existing Next.js App Router structure. New API route `app/api/sessions/route.ts` for session-specific CRUD (keeps progress route focused on aggregate state). New `lib/sessions.ts` for client-side session helpers consumed by the stats page.
