# Implementation Plan: Tabbed Stats Page Reorganisation

**Branch**: `015-stats-tabbed-reorg` | **Date**: 2026-05-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-stats-tabbed-reorg/spec.md`

## Summary

Restructure `app/stats/page.tsx` from a single-scroll layout containing 13+ heterogeneous panels into a five-tab WAI-ARIA tablist (Overview / Gamification / Performance / Weaknesses / History). Active tab is encoded in the URL hash (deep-linkable) and mirrored in `localStorage` (sticky last-tab). Inactive tab panels are unmounted, so charts in non-visible tabs do not render. Mobile uses a horizontally-scrollable tab row with the active tab auto-scrolled into view. Keyboard navigation follows the WAI-ARIA Authoring Practices Guide for tabs (Arrow / Home / End). No backend, schema, or data-flow changes — every existing panel component is reused untouched.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 16 App Router (Node 24 LTS).

**Primary Dependencies**: React 19, Next.js 16, Tailwind CSS v4, FontAwesome (already installed). No new runtime dependency is required for tabs — they will be implemented as a small first-party `<Tabs>` primitive over `useState` + `useEffect` to keep payload flat. (Headless UI / Radix considered and rejected — see `research.md`.)

**Storage**: Browser `localStorage` (single new key `nk-stats-active-tab`) and URL hash. No server-side storage. Vercel Blob untouched.

**Testing**: Vitest + Testing Library (component tests). All Given/When/Then acceptance scenarios in the spec map 1:1 to BDD tests under `tests/components/StatsTabs.test.tsx` and `tests/integration/stats-tabs.test.tsx`. Coverage on touched files MUST remain ≥ 80% per Constitution Principle II.

**Target Platform**: Modern evergreen browsers (latest Chrome/Edge/Safari/Firefox). Mobile Safari ≥ 16 and Android Chrome ≥ 110 covered. SSR enabled but the stats page is `"use client"` today; the new tab logic remains client-side.

**Project Type**: Next.js App Router web application — single-project layout. No backend changes.

**Performance Goals**:
- Overview tab first contentful paint **no slower** than the pre-feature stats page on the same dataset (SC-002).
- Tab switch to Performance/Weaknesses renders within 500ms with seeded data (5–50 sessions) on a mid-range laptop.
- Initial JS payload (gzipped) for `/stats` MUST NOT increase by more than 5KB versus the current build.
- The /stats route is **not** on the typing hot path, so Principle I (zero-latency keystrokes) does not gate this change — but the page MUST not introduce keystroke regressions if the user navigates back to typing afterward.

**Constraints**:
- No new persisted-data fields. `localStorage` gets exactly one new key (`nk-stats-active-tab`); no schema migration.
- WCAG 2.1 AA: keyboard operability, focus-visible rings, ≥ 44 px tap targets, contrast for selected/unselected tab labels.
- `prefers-reduced-motion` honoured: no animation on tab switch when set.
- No new outbound network calls. The Anthropic API stays gated behind user-key as today.

**Scale/Scope**: Single file `app/stats/page.tsx` is the primary edit (currently 404 lines). One new component (`components/StatsTabs.tsx`, the tablist primitive). One new lib helper (`lib/stats-tabs.ts` for hash + storage I/O). 5 tabs × at most 7 panels per tab; total 16 panels redistributed, all already implemented.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against the seven principles in `.specify/memory/constitution.md` (v1.0.0):

| Principle | Status | Notes |
|---|---|---|
| **I. Zero-Latency Keystrokes** | ✅ N/A | Stats page only; no keystroke hot path touched. |
| **II. BDD-Style Testing + ≥80% Coverage** | ✅ Plan compliant | Each FR maps to a Given/When/Then test in `tests/components/StatsTabs.test.tsx` and `tests/integration/stats-tabs.test.tsx`. New `lib/stats-tabs.ts` will be 100% unit-tested. The `/stats` page itself will get integration tests covering the five user stories. |
| **III. Spec-Driven Development** | ✅ Followed | This plan is generated from `spec.md` via the speckit pipeline. |
| **IV. SOLID, KISS, YAGNI** | ✅ Plan compliant | Single small `<Tabs>` primitive. No premature abstraction (e.g., not a generic "TabsContext" library). Hash + storage logic isolated in one ~30-line lib. No headless-ui dependency. |
| **V. Backendless** | ✅ N/A | Pure UI restructure. No new outbound calls, no new server-side dependencies. |
| **VI. Dark-First, Mobile-Friendly UX** | ✅ Plan compliant | Dark mode is the only mode designed-for. 320px viewport explicitly tested. Tap targets ≥ 44 px. |
| **VII. SemVer + Changelog** | 🟡 Pending | Will land as `v1.17.0` (MINOR — new feature, no breaking change). PR title and CHANGELOG entry to follow at PR time. |

**Result: PASS**. No Complexity Tracking entries needed.

**Re-check after Phase 1 design**: deferred to end of plan.md once research, data-model, contracts, and quickstart are written. (Performed below.)

## Project Structure

### Documentation (this feature)

```text
specs/015-stats-tabbed-reorg/
├── plan.md              # This file
├── research.md          # Phase 0 output: tab-impl options, headless-ui vs first-party, scrollIntoView mobile patterns
├── data-model.md        # Phase 1 output: Tab entity, TabSlug union, ActiveTabRecord (localStorage)
├── quickstart.md        # Phase 1 output: how to add/rename/remove a tab without editing core
├── contracts/
│   └── tabs-component.md  # Public contract of the <Tabs> + <TabPanel> primitive (props, ARIA, keyboard, hash/storage I/O)
├── checklists/
│   └── requirements.md  # Spec quality checklist (already complete)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT this command)
```

### Source Code (repository root)

```text
app/
└── stats/
    └── page.tsx                          # MODIFIED — switches from row-1..row-8 layout to <StatsTabs>
components/
├── StatsTabs.tsx                         # NEW — generic <Tabs>/<TabList>/<Tab>/<TabPanel> primitives + the 5-tab StatsTabs assembly
└── (existing components untouched)       # StreakCalendar, BadgeGallery, NemesisCard, DailyChallengeStats,
                                          # PersonalBestsCard, FingerLoadCard, WeeklyDigestCard, AnalyticsSummary,
                                          # DeepAnalytics, WpmChart, AccuracyChart, KeyboardHeatmap,
                                          # ErrorDistribution, BigramChart, SessionsPerWeek, ModeBreakdown
lib/
└── stats-tabs.ts                         # NEW — TabSlug union, parseTabSlug(hash), readPersistedTab(),
                                          # writePersistedTab(slug), resolveInitialTab({hash, persisted})
tests/
├── components/
│   └── StatsTabs.test.tsx                # NEW — Tabs primitive: ARIA, keyboard, prefers-reduced-motion
└── integration/
    └── stats-tabs.test.tsx               # NEW — full /stats flow: deep-link, persistence, mobile scrollIntoView,
                                          # cross-tab undo toast persistence
```

**Structure Decision**: Single-project Next.js layout (Option 1). One modified file (`app/stats/page.tsx`), one new component file (`components/StatsTabs.tsx`), one new lib file (`lib/stats-tabs.ts`), two new test files. No new directories. No new packages.

## Phase 0: Research Output

See `research.md`. Three decisions resolved:
1. **Tabs library vs first-party**: first-party (≈80 LOC) chosen over `@headlessui/react` (≈12KB gzipped) and `@radix-ui/react-tabs` (≈10KB gzipped). Rationale: payload budget + KISS principle + no transitive dependency churn.
2. **Hash routing approach**: native `window.location.hash` with `hashchange` listener. Next.js App Router does not need to know about hash changes (no SSR for hash). Avoids `useSearchParams`/`router.replace` ceremony.
3. **Mobile auto-scroll**: `Element.scrollIntoView({ inline: 'center', block: 'nearest', behavior })` with `behavior` set to `'auto'` when `prefers-reduced-motion: reduce`, otherwise `'smooth'`. Supported in all targeted browsers without polyfill.

## Phase 1: Design Output

- **Data model**: `data-model.md` documents the `TabSlug` union, the `Tab` descriptor object, and the `nk-stats-active-tab` localStorage record (string).
- **Contracts**: `contracts/tabs-component.md` documents the public API of the `<Tabs>` primitive and the `StatsTabs` assembly — props, ARIA roles, keyboard map, focus management, and how hash/storage I/O is exposed.
- **Quickstart**: `quickstart.md` shows how to (a) add a new tab to the stats page, (b) rename or reorder an existing tab, (c) deep-link from another page, and (d) instrument tab changes for analytics if added later.
- **Agent context update**: `CLAUDE.md` will be updated to point its plan reference at this file (`specs/015-stats-tabbed-reorg/plan.md`).

## Constitution Check (post-design)

After writing research / data-model / contracts / quickstart, no design choice triggers a violation:

- **I**: still N/A (stats page).
- **II**: BDD coverage plan unchanged — 1:1 mapping spec → tests.
- **IV**: design stayed minimal — first-party Tabs, single new lib, no extra abstractions.
- **V**: still N/A.
- **VI**: design enforces 44px targets, dark-first, prefers-reduced-motion.

**Post-design Constitution Check: PASS**. No Complexity Tracking entries.

## Complexity Tracking

> No violations. Section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_  |            |                                     |
