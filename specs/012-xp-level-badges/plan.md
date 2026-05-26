# Implementation Plan: XP Level Badges

**Branch**: `012-xp-level-badges` | **Date**: 2026-05-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-xp-level-badges/spec.md`

## Summary

Add 15 snarky level badges (one per XP level) using FontAwesome layered icons with neon glow styling. Badges unlock post-session when XP crosses a threshold, trigger a toast + confetti, persist in ProgressData, display in a gallery on the stats page, and show the current badge next to the XP bar.

## Technical Context

**Language/Version**: TypeScript strict, Next.js 16 App Router

**Primary Dependencies**: `@fortawesome/react-fontawesome`, `@fortawesome/free-solid-svg-icons`, `canvas-confetti` (new, ~3KB gzip)

**Storage**: localStorage (ProgressData.badges array)

**Testing**: Vitest + Testing Library, BDD style

**Target Platform**: Web (dark-first, 375px+ viewport)

**Project Type**: Web application (client-only feature, no API calls)

**Performance Goals**: Zero impact on keystroke hot path; badge logic runs post-session only

**Constraints**: No new network calls; all badge data is static config; confetti respects prefers-reduced-motion

**Scale/Scope**: 15 static badge definitions, 1 new stats section, 1 XP bar enhancement

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. Zero-Latency Keystrokes | PASS | Badge logic runs in `handleComplete` callback after session ends, never in keystroke path |
| II. BDD Testing | PASS | Each acceptance scenario maps to a test; badge unlock logic is pure → unit-testable |
| III. Spec-Driven | PASS | This plan follows the speckit pipeline |
| IV. SOLID/KISS/YAGNI | PASS | Single `lib/badges.ts` config + `BadgeIcon` component. No premature abstractions |
| V. Backendless | PASS | All client-side; localStorage only; no API calls |
| VI. Dark-First/Mobile | PASS | Neon glow on dark bg; badge gallery responsive grid |
| VII. SemVer | PASS | Will be v1.6.0 (new feature) |

## Project Structure

### Documentation (this feature)

```text
specs/012-xp-level-badges/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit-tasks)
```

### Source Code (repository root)

```text
lib/
├── badges.ts            # Badge definitions (15 entries) + unlock logic
├── achievements.ts      # Existing — badge unlock integrates here
└── types.ts             # BadgeDefinition, BadgeProgress types

components/
├── BadgeIcon.tsx         # Memoised FA layered icon renderer
├── BadgeGallery.tsx      # Stats page grid of all 15 badges
└── BadgeToast.tsx        # Unlock notification with confetti trigger

app/
├── page.tsx             # Add current badge next to XpBar
└── stats/page.tsx       # Add BadgeGallery section

tests/
├── badges.test.ts       # Unit tests for unlock logic + definitions
└── badge-gallery.test.ts # Component tests for gallery rendering
```

**Structure Decision**: Follows existing project layout — pure logic in `lib/`, UI in `components/`, page integration in `app/`.

## Complexity Tracking

No violations. All principles pass cleanly.
