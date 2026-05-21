# Features

## Training Modes

### Key Drill

Progressive drill levels from home-row to full keyboard. Uses real words (not random characters) for better muscle memory formation.

| Level | Characters | Unlock |
|-------|-----------|--------|
| Home Row | a s d f g h j k l ; | Always unlocked |
| Top Row | q w e r t y u i o p | 5 sessions at 85%+ on Home Row |
| Bottom Row | z x c v b n m , . | 5 sessions at 85%+ on Top Row |
| Numbers | 0-9 | 5 sessions at 85%+ on Bottom Row |
| Symbols | !@#$%^&*()... | 5 sessions at 85%+ on Numbers |
| Full | All characters | 5 sessions at 85%+ on Symbols |

**Adaptive Targeting**: ~40% of drill words are biased toward your error-prone keys (from the error heatmap + slow bigrams). Targets decay as you improve.

**Demotion**: Two consecutive sessions below 70% accuracy re-lock the current level and drop you back.

### Passage Mode

80+ curated passages across four categories:

- **Book**: Expeditionary Force, Dune, Hitchhiker's Guide, Foundation, Neuromancer, Discworld, LOTR, 1984
- **Movie**: Matrix, Interstellar, Blade Runner, Monty Python, Star Wars, Shawshank, Dark Knight
- **Code**: Python, TypeScript, Rust, Go, SQL, Bash
- **Quote**: Stoics, Nietzsche, Feynman, Sagan, Einstein

Three difficulties: Beginner → Intermediate → Advanced (unlocked via the same 5-session progression).

## Visual Keyboard

Full Keychron K2 HE (75%) layout below the typing area:
- Keys flash green (correct) or red (error) with scale animation
- Next expected key(s) glow as a guide (including Shift for capitals)
- Responsive sizing via `clamp()` — hidden on mobile viewports

## Error Heatmap

On the stats page, a visual keyboard heatmap shows cumulative error distribution:
- 7-band colour palette (blue → yellow → amber → orange → red → white-hot)
- Toggle between lowercase (abc) and uppercase (ABC) views via Switch component
- Each key shows its numeric error count

## AI Coaching Tips

Powered by Anthropic Claude Haiku. After 5+ errors in a session:
- Error patterns detected (repeated chars, adjacent swaps, speed errors, hand imbalance, fatigue drift)
- Timing analysis (hold duration, inter-key delay, slowest bigrams, hand stats)
- Deterministic hand-labelling (LEFT/RIGHT keys pre-bucketed in the prompt)
- Tip + explanation displayed as a floating toast

## XP & Achievements

- Base 5 XP per session + accuracy bonus (+5 at 95%+, +3 at 85%+)
- 20-level exponential XP curve
- Achievement unlocks: first session, speed milestones (30/50/70 WPM), accuracy milestones, streaks, level unlocks, character count milestones
- Achievement toasts with icons shown after session completion

## Session Management

### Per-Session Blob Storage

Each completed session is stored as an individual Vercel Blob:
- Path: `neuralkeys/sessions/{pin}/{session-id}.json`
- Full `EnrichedSessionSummary` with timing metadata
- Listable, fetchable by ID, deletable

### Session Deletion

On the stats page, each session row has a delete button (visible on hover/focus):
- Optimistic removal (row vanishes immediately)
- 5-second undo toast with countdown + Undo button
- After window expires: hard-delete from Blob + localStorage recalculation
- On failure: row restored + error toast

## Cloud Sync

Progress syncs to Vercel Blob after every session:
- Individual session blob written
- Aggregated progress summary updated (no growing allSessions array)
- Sync failures surfaced via red toast (only for real failures, not unconfigured environments)
- Automatic merge on stats-page load (local + remote, dedup by session ID)

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard-only operation for all flows
- Visible focus rings on all interactive elements
- `prefers-reduced-motion` suppresses all animations
- Screen-reader-friendly: aria-labels, live regions, semantic headings
- Tap targets ≥ 44px on all buttons/links
