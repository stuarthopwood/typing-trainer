# Quickstart: XP Level Badges

## Prerequisites

- Node.js 24 LTS
- Existing NeuralKeys dev environment (`npm install` done)

## New Dependency

```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

## Key Files to Create

| File | Purpose |
|------|---------|
| `lib/badges.ts` | 15 badge definitions + `checkBadgeUnlocks()` + `getBadgeForLevel()` |
| `components/BadgeIcon.tsx` | Memoised FA layered icon renderer |
| `components/BadgeGallery.tsx` | Stats page gallery grid |
| `components/BadgeToast.tsx` | Unlock notification component |
| `tests/badges.test.ts` | BDD tests for unlock logic |

## Key Files to Modify

| File | Change |
|------|--------|
| `lib/types.ts` | Add `BadgeIconLayer`, `BadgeDefinition`, `BadgeProgress` types; add `badges` to ProgressData |
| `app/page.tsx` | Call `checkBadgeUnlocks()` in session-complete flow; show toast; add badge to XpBar |
| `app/stats/page.tsx` | Add `<BadgeGallery>` section |
| `lib/progress.ts` | Migration: populate badges array for existing users on load |

## Integration Points

1. **Session complete** (`handleComplete` / `handleZenComplete` in `page.tsx`):
   - After XP is awarded, compare old level vs new level
   - If level increased, call `checkBadgeUnlocks(oldLevel, newLevel, existingBadges)`
   - Returns newly earned badges → set toast state + fire confetti

2. **XP Bar** (in `page.tsx` XpBar component):
   - `getBadgeForLevel(currentLevel)` returns the BadgeDefinition
   - Render `<BadgeIcon badge={currentBadge} size="sm" />` next to progress bar

3. **Stats page**:
   - Load progress, pass `badges` array to `<BadgeGallery>`
   - Gallery maps all 15 definitions, marks unlocked ones

## Quick Validation

```bash
npm test -- --run tests/badges.test.ts
npm run build
```

Verify in browser:
1. Complete a session → check if badge toast fires on level-up
2. Visit /stats → badge gallery shows with correct locked/unlocked state
3. Check localStorage → `badges` array populated
