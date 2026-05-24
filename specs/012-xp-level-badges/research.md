# Research: XP Level Badges

## FontAwesome 6 Free Icon Availability

**Decision**: Use FA 6 Free for all badge icons; substitute Pro-only icons with Free alternatives.

**Findings**:
- `fa-lasso` → Pro only. **Substitute**: `fa-circle-notch` (spinning/catching metaphor)
- `fa-hat-cowboy` → Pro only. **Substitute**: `fa-hat-wizard` (Free, still fun headgear)
- All other icons in the badge table are available in FA 6 Free Solid

**Rationale**: No Pro license needed; substitutions maintain the snarky character.

## Confetti Library

**Decision**: Use `canvas-confetti` (npm package, ~3KB gzipped)

**Rationale**:
- Already battle-tested (30M+ weekly downloads)
- Zero-dependency, works with any framework
- Single function call `confetti()` — minimal integration surface
- Supports `disableForReducedMotion` option natively
- No DOM manipulation beyond a temporary canvas

**Alternatives considered**:
- CSS keyframes: too limited for realistic particle spread
- `react-confetti`: React-specific wrapper, adds unnecessary abstraction
- Custom canvas: YAGNI — why write what exists

## XP Level Thresholds

**Decision**: Use existing `getLevelFromXp()` function from `lib/achievements.ts`

**Findings**: Current implementation uses a formula-based approach. Levels 1-15 map directly to badge indices. The function returns `{ level, currentXp, nextLevelXp }` — badge unlock simply checks if `level` increased after XP award.

**Rationale**: No new threshold logic needed; badges piggyback on existing level system.

## Badge Persistence Migration

**Decision**: Add `badges: BadgeProgress[]` to ProgressData; on first load if missing, retroactively award badges based on current level.

**Rationale**:
- Existing users shouldn't lose progress — if they're level 5, they get badges 1-5 immediately
- Migration is a simple check: if `progress.badges === undefined`, compute and set
- No schema version needed; presence check is sufficient

**Alternatives considered**:
- Separate localStorage key: splits state, complicates sync
- Version flag migration: over-engineering for adding one array field

## Toast Pattern

**Decision**: Reuse existing achievement toast pattern (4-second auto-dismiss, same position)

**Findings**: Current `newAchievements` state in `page.tsx` shows inline achievement notifications. Badge toast follows the same pattern but with the badge icon instead of achievement icon.

**Rationale**: Consistent UX; users already understand this feedback position.
