# Architecture

NeuralKeys is a backendless typing trainer built as a static-export-friendly Next.js 16 app. All state lives in the browser (localStorage) with optional Vercel Blob sync for cross-device persistence.

## System Overview

```
Browser (client)                     Vercel (edge)
┌─────────────────────┐             ┌──────────────────────┐
│ Next.js App Router   │  ─ PUT ──► │ /api/progress        │ ──► Vercel Blob
│ localStorage (SoT)  │  ◄─ GET ── │ /api/sessions        │       (backup)
│                      │  ─ POST ─► │ /api/tips            │ ──► Anthropic API
└─────────────────────┘             └──────────────────────┘
```

**Source of truth**: localStorage. Blob is a backup for cross-device sync. If Blob is unavailable, the app degrades gracefully to local-only mode.

## Directory Structure

```
app/
├── page.tsx                 # Main typing page (drill + passage modes)
├── stats/page.tsx           # Stats dashboard
├── layout.tsx               # Root layout (fonts, metadata, analytics)
├── globals.css              # Tailwind imports, animations, CSS vars
└── api/
    ├── progress/route.ts    # GET/PUT aggregated progress
    ├── sessions/route.ts    # GET/POST/DELETE individual sessions
    └── tips/route.ts        # POST AI tip generation

components/
├── TypingArea.tsx           # THE typing surface (keystroke handling, memoized Chars)
├── VisualKeyboard.tsx       # Keychron K2 visual keyboard
├── KeyboardKey.tsx          # Individual key (active/expected/idle states)
├── KeyboardHeatmap.tsx      # Error heatmap (7-band palette, case toggle)
├── ModeSelector.tsx         # Drill/passage toggle + level/difficulty selectors
├── StatsDisplay.tsx         # Live WPM/accuracy/time/combo (memoized)
├── GlowBorder.tsx           # Animated glow border (pointer-following)
├── TipBox.tsx               # AI tip toast (fixed position)
├── UndoToast.tsx            # Undo countdown toast (delete flow)
├── Switch.tsx               # Toggle switch (role="switch")
├── PinEntry.tsx             # PIN login screen
└── charts/                  # Recharts-based stats charts (8 components)

lib/
├── engine.ts                # WPM/accuracy calculation, session stats builder
├── drills.ts                # Drill text generation (adaptive targeting)
├── passages.ts              # 80+ curated passages with metadata
├── progress.ts              # localStorage CRUD, sync, merge, recalculate
├── sessions.ts              # Client-side session blob helpers
├── analytics.ts             # Timing metadata, hand stats, practice targets
├── tips.ts                  # Error pattern detection, tip prompt builder
├── achievements.ts          # Achievement definitions + unlock checker
├── celebrations.ts          # Confetti + glow effects
├── sounds.ts                # Web Audio API key sounds
├── keyboard-layout.ts       # Keychron K2 key definitions
└── types.ts                 # Shared TypeScript interfaces

tests/                       # Vitest BDD-style tests (161 tests)
specs/                       # Spec-kit feature specifications (001-010)
```

## Data Flow

### Keystroke Path (Constitution Principle I — zero latency)

```
KeyboardEvent (window)
  → TypingArea.handleKeyDown (useCallback, stable via positionRef)
    → keyStrokesRef.current.push(stroke)   ← no React state, no re-render
    → setPosition(newPos)                  ← one state update, batched
    → onProgress(pos, keyStrokes)          ← parent updates live stats
    → onKeyPress(key, code, correct)       ← visual keyboard feedback
```

The keydown event listener registers ONCE (deps: `[text, onComplete, onProgress, onKeyPress]` — position removed via ref). No listener teardown/re-registration per keystroke.

### Session Completion Path

```
TypingArea: newPosition >= text.length
  → onComplete(keyStrokes)
  → app/page.tsx handleComplete:
    1. buildSessionStats(keyStrokes)
    2. computeSessionTimingMetadata(keyStrokes)
    3. recordSession(stats, mode, enrichment) → localStorage
    4. processDrillDemotion(...)
    5. checkAchievements(...)
    6. updatePracticeTargets(...)
    7. syncToRemote(progress, session) → PUT /api/progress
       → writes individual session blob
       → writes progress summary (no allSessions)
```

### Stats Page Data Loading

```
Stats page mount:
  1. getProgress() ← localStorage (instant)
  2. migrateAllSessions() ← POST /api/sessions?action=migrate (one-time)
  3. loadAllSessions() ← GET /api/sessions (paginated blob listing)
  4. Merge local recentSessions + remote blobs (dedup by ID)
```

## Storage Model

### localStorage (`typing-trainer-progress`)

Single JSON object containing aggregated stats, recent sessions (last 50), error heatmap, level progress, achievements, tips, practice targets. Always up-to-date. ~5-15KB.

### Vercel Blob

| Path | Content | Purpose |
|------|---------|---------|
| `neuralkeys/progress-{pin}.json` | Aggregated ProgressData (no allSessions) | Cross-device sync, backup |
| `neuralkeys/sessions/{pin}/{uuid}.json` | Individual EnrichedSessionSummary | Granular history, fetch/delete |

### PIN Isolation

Users are isolated by 4-6 digit PIN. The PIN is:
- Stored in `localStorage` as `neuralkeys-pin`
- Sent as `x-user-pin` header on every API call
- Used to construct blob paths (e.g., `neuralkeys/sessions/6767/...`)
- Validated server-side as digits-only, 4-8 chars (path traversal protection)

## Performance Architecture

### Keystroke Hot Path Rules (Constitution Principle I)

- `Char` component is memoized — one keystroke does NOT re-render the whole text
- Keystroke array lives in `useRef`, not state — no re-renders on push
- No synchronous work > 2ms in keydown handler
- No localStorage writes, no network calls, no JSON.parse during typing
- Event listeners register once (positionRef + activeKeyRef pattern)
- StatsDisplay is memoized
- fetchTip is deferred via setTimeout(..., 0) off the keystroke frame

### Bundle Splitting

- Recharts (200KB) only loads on `/stats` route (code-split by Next.js)
- FontAwesome uses individual icon imports (tree-shaken)
- Main page JS < 250KB gzipped

## API Routes

All routes require `x-api-key` header (timing-safe comparison) and `x-user-pin` header.

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/progress` | GET, PUT | Read/write aggregated progress summary |
| `/api/sessions` | GET, POST, DELETE | List/migrate/fetch/delete individual sessions |
| `/api/tips` | POST | Generate AI typing tip via Anthropic Claude |
