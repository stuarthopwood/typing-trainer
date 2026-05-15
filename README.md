# Typing Trainer

A web-based typing trainer built to improve speed and accuracy through progressive drills and curated passages. Dark-themed, zero-latency, mobile-friendly.

**Live:** Deployed on Vercel via `master` branch.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (dark-first, custom variant)
- **Fonts:** Inter (UI) + JetBrains Mono (typing text) via `next/font`
- **Icons:** Font Awesome (react-fontawesome)
- **Analytics:** @vercel/analytics + @vercel/speed-insights
- **Tests:** Vitest + @testing-library/react (41+ tests)
- **CI:** GitHub Actions — tests + build on every PR

## Getting Started

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # Run test suite
npm run build    # Production build
```

## Features

### Training Modes

**Key Drill** — Progressive levels from home-row to full keyboard. Uses real words (not random characters) for better muscle memory.

**Passage** — Curated quotes from sci-fi, fantasy, comedy, and code. Filterable by difficulty and category.

### Visual Keyboard

A full Keychron K2 HE (75%) layout rendered below the typing area:
- Keys flash green/red on press with scale animation
- Next expected key(s) glow dimly as a guide (including Shift for capitals)
- Modifiers stay highlighted while held
- Hidden on mobile — responsive with `clamp()`-based sizing

### Progressive Unlocking

Drill levels and passage difficulties are gated behind a progression system:
- Must complete 5 sessions at 85%+ accuracy to unlock the next level
- Locked levels show greyed out with a progress counter (e.g., "3/5")
- First level of each track (home-row, beginner) always unlocked

### UX

- Backspace allowed — original errors stay in history (no accuracy cheating)
- Caps Lock detection with blocking overlay
- Enter/Space to advance after completion
- Celebration tiers with confetti (based on accuracy thresholds)
- Combo counter for consecutive correct keystrokes
- INP-optimised — memoized character rendering, minimal DOM updates per keystroke

### Stats

- Live WPM, accuracy, time elapsed, combo counter
- Stats dashboard with session history
- localStorage persistence (no backend required)

## Architecture

```
app/           → Pages (main typing + stats dashboard)
components/    → TypingArea, StatsDisplay, ModeSelector
lib/           → Pure functions (engine, drills, passages, progress, celebrations)
tests/         → Vitest test suite (BDD-style)
```

## Theme

Razer-inspired dark design: `#0d0d0d` background, `#141414` surfaces, electric green `#00ff88` accents.

## Git Workflow

- `master` — production (auto-deploys to Vercel, branch-protected)
- `dev` — development (preview deploys)
- All work on `dev`, merge via PR with CI passing

## Roadmap

- Virtual keyboard overlay with finger positions
- Progressive level unlocking (95%+ required)
- WPM graph over time
- Sound effects (optional)
- Cross-device sync
- Light mode toggle
