# Tasks: XP Level Badges

**Feature**: 012-xp-level-badges
**Branch**: `012-xp-level-badges`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Phase 1: Setup

- [ ] T001 Install `canvas-confetti` and `@types/canvas-confetti` via npm
- [ ] T002 Add `BadgeIconLayer`, `BadgeDefinition`, `BadgeProgress` types to `lib/types.ts`
- [ ] T003 Add `badges: BadgeProgress[]` field to `ProgressData` interface in `lib/types.ts`

## Phase 2: Foundational

- [ ] T004 Create `lib/badges.ts` with all 15 badge definitions (id, name, subtitle, level, FA icon layers)
- [ ] T005 [P] Implement `checkBadgeUnlocks(oldLevel: number, newLevel: number, existing: BadgeProgress[]): BadgeDefinition[]` in `lib/badges.ts`
- [ ] T006 [P] Implement `getBadgeForLevel(level: number): BadgeDefinition` in `lib/badges.ts`
- [ ] T007 Add badge migration logic in `lib/progress.ts` — if `progress.badges` is undefined, retroactively award badges for current level on `getProgress()`
- [ ] T008 Create `components/BadgeIcon.tsx` — memoised FA layered icon renderer accepting `badge: BadgeDefinition`, `locked?: boolean`, `size?: "sm" | "md" | "lg"`

## Phase 3: User Story 1 — Badge Unlock on Level-Up (P1)

- [ ] T009 [US1] Write BDD tests in `tests/badges.test.ts` for unlock logic: Given XP crosses level N threshold, When session completes, Then badge N unlocks and is persisted
- [ ] T010 [US1] Write BDD test for multi-level jump: Given XP crosses two thresholds at once, Then only highest newly-earned badge shows in toast
- [ ] T011 [US1] Write BDD test for idempotency: Given badge already earned, When session at same level completes, Then no duplicate badge awarded
- [ ] T012 [US1] Integrate `checkBadgeUnlocks()` into `handleComplete` in `app/page.tsx` — compare level before/after XP award
- [ ] T013 [US1] Integrate `checkBadgeUnlocks()` into `handleZenComplete` in `app/page.tsx`
- [ ] T014 [US1] Create `components/BadgeToast.tsx` — shows badge icon + name + subtitle, auto-dismiss after 4s
- [ ] T015 [US1] Add confetti trigger in badge toast using `canvas-confetti` with `disableForReducedMotion: true`
- [ ] T016 [US1] Wire badge toast state in `app/page.tsx` — show `BadgeToast` when new badges earned

## Phase 4: User Story 2 — Badge Gallery on Stats Page (P2)

- [ ] T017 [P] [US2] Create `components/BadgeGallery.tsx` — responsive grid showing all 15 badges, locked (grey/opacity) vs unlocked (full colour + neon glow)
- [ ] T018 [P] [US2] Write component test in `tests/badge-gallery.test.ts` — Given user with 3 badges, When gallery renders, Then 3 glow + 12 greyed
- [ ] T019 [US2] Integrate `BadgeGallery` into `app/stats/page.tsx` — new section with heading
- [ ] T020 [US2] Add unlock date display to unlocked badges in gallery (tooltip or small text)

## Phase 5: User Story 3 — Current Badge in XP Bar (P3)

- [ ] T021 [US3] Add `getBadgeForLevel(level)` call inside XpBar component in `app/page.tsx`
- [ ] T022 [US3] Render `<BadgeIcon badge={currentBadge} size="sm" />` adjacent to level text in XpBar
- [ ] T023 [US3] Write test: Given user at level 5, When main page renders, Then level 5 badge icon visible next to XP bar

## Phase 6: Polish & Cross-Cutting

- [ ] T024 Verify all 15 FA icons resolve from `@fortawesome/free-solid-svg-icons` — document any needed substitutions
- [ ] T025 Add CHANGELOG.md entry under v1.6.0 heading
- [ ] T026 Ensure badge components honour `prefers-reduced-motion` (no glow animation pulse when reduced)
- [ ] T027 Verify mobile layout (375px) for badge gallery grid (2-3 columns) and XP bar badge

## Dependencies

```
T001-T003 → T004-T008 (setup before foundational)
T004-T008 → T009-T016 (US1 needs badge defs + BadgeIcon)
T004-T008 → T017-T020 (US2 needs badge defs + BadgeIcon)
T004-T008 → T021-T023 (US3 needs badge defs + BadgeIcon)
US1, US2, US3 are independent of each other (can be done in any order after foundational)
```

## Parallel Opportunities

- T005 + T006: Independent pure functions, different concerns
- T005 + T008: Different files (lib vs component)
- T017 + T018: Component + test can be written together
- US1, US2, US3 phases can technically run in parallel (all depend only on Phase 2)

## Implementation Strategy

**MVP**: Phase 1 + Phase 2 + Phase 3 (US1) — users get badge unlocks with celebrations
**Increment 1**: Phase 4 (US2) — gallery provides browse/motivation
**Increment 2**: Phase 5 (US3) — persistent badge visibility
**Polish**: Phase 6 — mobile, a11y, changelog

## Summary

- **Total tasks**: 27
- **US1 (Badge Unlock)**: 8 tasks
- **US2 (Badge Gallery)**: 4 tasks
- **US3 (XP Bar Badge)**: 3 tasks
- **Setup/Foundational**: 8 tasks
- **Polish**: 4 tasks
