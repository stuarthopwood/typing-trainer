@AGENTS.md

# NeuralKeys — Project Context

## What This Is

NeuralKeys — a web-based typing trainer built by Stuart Hopwood to build neural pathways through keystroke repetition. Deployed on Vercel.

**Repo:** https://github.com/stuarthopwood/typing-trainer
**Owner:** Stuart Hopwood (stuarthopwood)

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (custom dark variant via `@custom-variant`)
- **Fonts:** Inter (UI, sans-serif) + JetBrains Mono (typing text, monospace) — Google Fonts via `next/font`
- **Icons:** Font Awesome (free-solid-svg-icons, react-fontawesome)
- **Analytics:** @vercel/analytics + @vercel/speed-insights
- **Tests:** Vitest + @testing-library/react (BDD-style, 41+ tests)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — tests + build on every PR
- **Branch protection:** `master` requires CI pass + PR (no direct push)
- **Package manager:** npm

## Design Principles

- **SOLID, KISS, YAGNI** — no premature abstractions, no over-engineering
- **Zero-latency keystrokes** — memoized `Char` component, `useRef` for keystroke array, no debouncing
- **Dark-first theme** — Razer-inspired: #0d0d0d background, #141414 surfaces, electric green (#00ff88) accents
- **Mobile-friendly** — responsive, large touch targets, full viewport width
- **No backend** — all client-side, localStorage for progress

## Architecture

```
app/
├── page.tsx              # Main typing page (single page app)
├── stats/page.tsx        # Progress/stats dashboard
├── layout.tsx            # Root layout (fonts, dark mode, analytics)
└── globals.css           # Tailwind imports + shake animation + CSS vars
components/
├── TypingArea.tsx        # Core typing component (keydown handling, memoized chars)
├── StatsDisplay.tsx      # Live WPM/accuracy/time/combo (centred, no borders)
├── ModeSelector.tsx      # Mode toggle + difficulty signal bars + level/category buttons
lib/
├── types.ts              # TypeScript interfaces
├── engine.ts             # Pure functions: WPM calc, accuracy, session stats, celebration tiers
├── drills.ts             # Key drill levels + real word banks per level
├── passages.ts           # Hard-coded passage library (books, movies, code)
├── progress.ts           # localStorage progress tracking (streaks, heatmap, sessions)
├── celebrations.ts       # Canvas confetti particles + glow class generation
tests/
├── engine.test.ts        # WPM, accuracy, session stats, celebration tiers
├── drills.test.ts        # Word generation, level configs
├── passages.test.ts      # Passage retrieval, filtering
├── progress.test.ts      # Session recording, streaks
├── celebrations.test.ts  # Glow classes
└── setup.ts              # jsdom + testing-library setup
```

## Training Modes

### 1. Key Drill
- Progressive levels: home-row → top-row → bottom-row → numbers → symbols → full
- Uses REAL words per level (not random characters) — better for muscle memory
- Word banks in `lib/drills.ts`

### 2. Passage
- Quotes from: Expeditionary Force (Skippy), Hitchhiker's Guide, Discworld, LOTR, Matrix, Blade Runner, Interstellar, Monty Python
- Code snippets: Python, TypeScript
- Filterable by difficulty (beginner/intermediate/advanced) and category (book/movie/code)
- Difficulty selector: signal-bar style, click to cycle

## Key UX Decisions

- **Backspace allowed** — user can go back and re-type, but original error STAYS in keystroke history (no accuracy cheating)
- **Caps Lock detection** — blocking red overlay until turned off
- **Enter/Space after completion** — loads next passage without mouse
- **Celebration tiers** — confetti + glow based on accuracy: none (<90%), good (90-95%), great (95-99%), perfect (100%)
- **Combo counter** — appears after 2+ correct in a row (fire icon)
- **INP optimised** — memoized `Char` component, only 2 DOM updates per keystroke

## Theme / Colours

| Purpose | Value |
|---|---|
| Background | #0d0d0d |
| Surface | #141414 |
| Accent (green) | #00ff88 |
| Accent dim | #00cc6a |
| Correct text | #00ff88 at 80% opacity |
| Error text | red-400 with strikethrough |
| Cursor | white text + #00ff88/15 bg + green bottom border |
| Pending text | neutral-600 |
| Stats active | emerald-400 |

## Git Workflow

- `master` = production (auto-deploys to Vercel)
- `dev` = development (preview deploys)
- All work on `dev`, merge via PR when ready
- CI must pass before merge (tests + build)

## Running Locally

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build    # production build check
```

## What's Next (Ideas / Backlog)

- Virtual keyboard overlay showing finger positions
- Progressive level unlocking (require 95%+ to unlock next)
- More passages (expandable library)
- Personal best notifications
- WPM graph over time on stats page
- Sound effects (optional)
- Cross-device sync (PIN or similar, like the GCSE app)
- Light mode toggle (currently dark-only by default)

## Agent skills

### Issue tracker

GitHub Issues at stuarthopwood/typing-trainer (`gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repo — one `CONTEXT.md` + `docs/adr/` at root. See `docs/agents/domain.md`.
