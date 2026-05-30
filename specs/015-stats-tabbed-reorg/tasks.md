---

description: "Task list for tabbed stats page reorganisation"
---

# Tasks: Tabbed Stats Page Reorganisation

**Input**: Design documents from `/specs/015-stats-tabbed-reorg/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: BDD-style tests are MANDATORY per Constitution Principle II. Every functional requirement and acceptance scenario from the spec MUST have a corresponding `describe/it` test with explicit Given/When/Then phases. Coverage on touched files in `lib/**` and `components/**` MUST stay between 80% and 100% (lines AND branches).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Single-project Next.js App Router layout:

- `app/` — pages and routes
- `components/` — React components
- `lib/` — pure logic, types, helpers
- `tests/` — Vitest + Testing Library

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project plumbing required before any tab-related work begins.

- [X] T001 Confirm working directory is on branch `015-stats-tabbed-reorg` and that `master` has been merged in (rebase if behind). Run `npm install` to ensure dependencies match `package-lock.json`.
- [X] T002 [P] Run baseline `npm run lint`, `npm test`, `npm run build` and record they pass. This is the green-baseline reference for the post-implementation quality gate.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and helpers every user story depends on.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

- [X] T003 Create `lib/stats-tabs.ts` with the `TabSlug` union, `parseTabSlug`, `readPersistedTab`, `writePersistedTab`, and `resolveInitialTab` per `contracts/tabs-component.md` § 4. Make all functions SSR-safe and tolerant of missing/throwing `localStorage`.
- [X] T004 Create `tests/stats-tabs.test.ts` with BDD-style unit tests for every function in `lib/stats-tabs.ts`: `parseTabSlug` round-trip and rejection cases; `readPersistedTab` for absent / valid / invalid / throwing storage; `writePersistedTab` for working / throwing storage; `resolveInitialTab` for hash-wins / storage-wins / default / SSR-safe. Each `it` MUST use `Given / When / Then` comments and describe observable behaviour, not implementation. Coverage on `lib/stats-tabs.ts` MUST be 100% (it's a small leaf file).
- [X] T005 Create the generic primitive at `components/StatsTabs.tsx`. Export `<Tabs>`, `<TabList>`, `<Tab>`, `<TabPanel>` per `contracts/tabs-component.md` § 1. Implement: ARIA roles (`tablist`, `tab`, `tabpanel`), id linkage (`stats-tab-<slug>` ↔ `stats-panel-<slug>`), `aria-selected`, roving `tabIndex`, focus-visible ring, dark-mode active/inactive accent. Lazy-mount panel children behind `tabId === activeTab`. Do NOT yet wire up keyboard handlers — that lands in T006.
- [X] T006 Add the keyboard handler to `<TabList>` in `components/StatsTabs.tsx`: ArrowLeft/Right wrap-around, ArrowUp/Down (alias for Left/Right), Home/End jump-and-activate. Tab key naturally moves focus into the active panel — no custom handler required. Active tab follows focus (manual-activation pattern from research.md).
- [X] T007 Wire the assembled `<StatsTabs>` shell in `components/StatsTabs.tsx`: declare the `TABS` array (5 descriptors with slug, label, icon), own `activeTab` via `useState(() => resolveInitialTab())`, register a `hashchange` listener, call `writePersistedTab` + `history.replaceState` on every change. Empty `<TabPanel>` bodies for now — panel content lands in story-specific tasks. Implement `scrollActiveTabIntoView` honouring `prefers-reduced-motion`.

**Checkpoint**: Foundation ready — all five user stories can begin (in parallel if staffed).

---

## Phase 3: User Story 1 — Discoverable, themed stats sections (Priority: P1) 🎯 MVP

**Goal**: Users see five tabs and the active tab shows only its own panels. Switching tabs swaps the panel set. Header and toasts persist.

**Independent Test**: Open `/stats` with seeded data → 5 tabs visible, Overview active, Overview panels visible, no other tabs' panels in the DOM. Click Performance → Performance panels visible, Overview panels gone.

### Tests for User Story 1 (write FIRST, ensure they fail before T013–T017)

- [X] T008 [P] [US1] Add to `tests/integration/stats-tabs.test.tsx` (new file) a Given/When/Then for acceptance scenario US1 #1: with seeded `progress` (≥1 session), rendering `<StatsPage />` exposes 5 tabs with the right labels and Overview is active by default with the big-stat row, Recent Sessions list, and AI Tips visible.
- [X] T009 [P] [US1] In `tests/integration/stats-tabs.test.tsx`, BDD test for US1 #2: clicking the "Performance" tab swaps panels — Performance panels mount; Overview panels are no longer in the DOM. Use `screen.queryBy*` to assert removal.
- [X] T010 [P] [US1] In `tests/integration/stats-tabs.test.tsx`, BDD test for US1 #3: header (back arrow + "Stats" + logout) and any pending undo toast remain in the DOM regardless of active tab. Switch tabs while a deletion is pending; assert toast and header still present.

### Implementation for User Story 1

- [X] T011 [US1] In `components/StatsTabs.tsx`, define the Overview `<TabPanel>` body: render the existing big-stat row (Sessions / Best WPM / Best Accuracy / Day Streak / Avg WPM), the Recent Sessions list with delete-with-undo plumbing, and the AI Tips list. Lift the JSX from `app/stats/page.tsx` rows 1–2 verbatim, preserving every existing `aria-label`, `role="region"`, and key handler. Pass deletion callbacks down via props from `<StatsTabs>`.
- [X] T012 [US1] In `components/StatsTabs.tsx`, define the Gamification `<TabPanel>` body: StreakCalendar, BadgeGallery, NemesisCard (gated on errorHeatmap non-empty), DailyChallengeStats. Each panel keeps its existing `<Panel>` wrapper visual.
- [X] T013 [US1] In `components/StatsTabs.tsx`, define the Performance `<TabPanel>` body: PersonalBestsCard (gated `sessions.length > 0`), FingerLoadCard (gated errorHeatmap), WeeklyDigestCard (gated `sessions.length ≥ 3`), AnalyticsSummary (≥ 3), DeepAnalytics (≥ 5), then a 2-col grid containing WpmChart and AccuracyChart (each gated `sessions.length ≥ 2`).
- [X] T014 [US1] In `components/StatsTabs.tsx`, define the Weaknesses `<TabPanel>` body: KeyboardHeatmap with the case-toggle Switch (state lifted from page), ErrorDistribution, and BigramChart in a 2-col grid (preserve existing single-column collapse when only one is non-empty). Pass `heatmapCase` and `onHeatmapCaseChange` from props.
- [X] T015 [US1] In `components/StatsTabs.tsx`, define the History `<TabPanel>` body: SessionsPerWeek (gated ≥ 2) and ModeBreakdown.
- [X] T016 [US1] In `app/stats/page.tsx`, replace rows 1–8 with a single `<StatsTabs>` invocation. Pass `progress`, `sessions` (the merged list), `loadingHistory`, `heatmapCase`, `onHeatmapCaseChange`, and `onDeleteSession`. Keep the page header, the loading-history spinner outside the tabs, and the global undo-toast container exactly as today (FR-017, FR-018). Do NOT change the deletion or undo logic — only the JSX containing the panels.
- [X] T017 [US1] In `components/StatsTabs.tsx`, add empty-state handling per FR-019: if every panel in the active tab is gated out (no qualifying data), render a single neutral message such as "Complete a session to populate this section." inside the `<TabPanel>`. Add a Given/When/Then test in `tests/integration/stats-tabs.test.tsx` for the empty case (no sessions, no errors).

**Checkpoint**: At this point, the page is fully tabbed and User Story 1 is independently demoable.

---

## Phase 4: User Story 2 — Deep-linkable and persistent tab state (Priority: P2)

**Goal**: `/stats#weaknesses` opens directly to Weaknesses; revisits without a hash land on the last-used tab.

**Independent Test**: Visit `/stats#performance` → Performance active. Click Weaknesses, navigate away, return to `/stats` → Weaknesses still active. Visit `/stats#nonsense` → Overview active.

### Tests for User Story 2

- [X] T018 [P] [US2] In `tests/integration/stats-tabs.test.tsx`, BDD test for US2 #1: `window.location.hash = 'performance'` before render → Performance tab active, Performance panels rendered, no flash of Overview.
- [X] T019 [P] [US2] In `tests/integration/stats-tabs.test.tsx`, BDD test for US2 #2: tab activation writes `localStorage`; on a fresh render with no hash, the persisted tab is active.
- [X] T020 [P] [US2] In `tests/integration/stats-tabs.test.tsx`, BDD test for US2 #3: hash `#nonsense` falls back to `'overview'`. Hash `#`, empty string, and `null` likewise fall back.
- [X] T021 [P] [US2] In `tests/integration/stats-tabs.test.tsx`, BDD test for US2 #4: clicking a tab updates `location.hash` (assert via `window.location.hash` after the click) and `localStorage.getItem('nk-stats-active-tab')` matches.

### Implementation for User Story 2

- [X] T022 [US2] In `components/StatsTabs.tsx`, ensure `setActiveTab` is the single chokepoint that writes to `localStorage` AND `history.replaceState`. Avoid feedback loop with the `hashchange` listener (compare slug to current `location.hash` before replacing).
- [X] T023 [US2] In `components/StatsTabs.tsx`, register the `hashchange` listener in a `useEffect` and call `setActiveTab(parseTabSlug(location.hash) ?? activeTab)` on event. Clean up on unmount.
- [X] T024 [US2] In `tests/stats-tabs.test.ts`, ensure unit-level coverage already added in T004 covers the no-flash path: `resolveInitialTab` returns the hash-derived slug synchronously, before any `useEffect` runs (this is asserted at integration level, but the underlying contract lives in the lib).

**Checkpoint**: Deep links and persistence work; the feature is share-able and sticky.

---

## Phase 5: User Story 3 — Mobile-friendly tab navigation (Priority: P2)

**Goal**: On a 320px viewport, the tab bar overflows horizontally with native scroll, every tab is ≥ 44×44 px, and activating an off-screen tab scrolls it into view.

**Independent Test**: Render the page in jsdom with a clipped tablist container; activate a tab whose `getBoundingClientRect()` is outside the container; assert `scrollIntoView` is called with `inline: 'center', block: 'nearest', behavior: 'smooth'`.

### Tests for User Story 3

- [X] T025 [P] [US3] In `tests/integration/stats-tabs.test.tsx`, BDD test for US3 #1: with the tablist container's `scrollWidth > clientWidth`, every tab measures ≥ 44 px height and the tablist has `overflow-x: auto` styling. Assert via `getComputedStyle` and `getBoundingClientRect`.
- [X] T026 [P] [US3] In `tests/integration/stats-tabs.test.tsx`, BDD test for US3 #2: spy on `Element.prototype.scrollIntoView`; activate the History tab when its bounding rect is outside the tablist; assert `scrollIntoView` called with `{inline: 'center', block: 'nearest', behavior: 'smooth'}`. With `matchMedia('(prefers-reduced-motion: reduce)')` matching, assert `behavior: 'auto'`.

### Implementation for User Story 3

- [X] T027 [US3] In `components/StatsTabs.tsx`, give the `<TabList>` Tailwind classes for `flex flex-nowrap overflow-x-auto scrollbar-hide` (or equivalent) and ensure each `<Tab>` button has `min-h-[44px] min-w-[44px] px-4 py-3` so tap targets are honoured (FR-013).
- [X] T028 [US3] In `components/StatsTabs.tsx`, implement `scrollActiveTabIntoView()` per `contracts/tabs-component.md` § 2: only call `scrollIntoView` when the active tab's rect is not fully within the tablist's rect (cheap visibility test). Determine `behavior` from `matchMedia('(prefers-reduced-motion: reduce)').matches`.
- [X] T029 [US3] In `components/StatsTabs.tsx`, refs to the tablist container and the active tab button: a small `useRef` for the container, plus a `Map<TabSlug, HTMLButtonElement>` populated via `ref` callbacks on each tab. After `setActiveTab` runs, schedule `scrollActiveTabIntoView()` in a `requestAnimationFrame` so layout has settled.

**Checkpoint**: Mobile users can find every tab without losing their place.

---

## Phase 6: User Story 4 — Keyboard-only and screen-reader navigation (Priority: P2)

**Goal**: Every tab is reachable and operable with keyboard alone; ARIA roles and selected-state are announced correctly.

**Independent Test**: Tab into the tablist; ArrowRight moves focus + activation; Home jumps to first; End to last; Tab leaves the tablist into the active panel.

### Tests for User Story 4

- [X] T030 [P] [US4] In `tests/components/StatsTabs.test.tsx` (new file, dedicated to the primitive in isolation), BDD test for the ARIA contract: `<TabList>` has `role="tablist"` and an `aria-label`; each `<Tab>` has `role="tab"`, `aria-selected`, `aria-controls`, `tabIndex` 0/-1; each `<TabPanel>` has `role="tabpanel"`, `aria-labelledby`, `tabIndex={-1}`.
- [X] T031 [P] [US4] In `tests/components/StatsTabs.test.tsx`, BDD test for US4 #1: focus on the active tab; keydown ArrowRight → focus and activation move to next tab; ArrowLeft from first tab wraps to last.
- [X] T032 [P] [US4] In `tests/components/StatsTabs.test.tsx`, BDD test for US4 #2: keydown Home from any tab → focus + activation on first tab; End → last tab.
- [X] T033 [P] [US4] In `tests/components/StatsTabs.test.tsx`, BDD test for US4 #3: after activation, `aria-selected="true"` is set on exactly one tab; the matching `<TabPanel>` has `aria-labelledby` pointing at that tab's `id`.

### Implementation for User Story 4

- [X] T034 [US4] In `components/StatsTabs.tsx`, the keyboard handler from T006 is already in place. Verify it follows the WAI-ARIA APG manual-activation pattern: ArrowRight/Left/Down/Up move focus AND activation; Home/End jump and activate. Wrap-around at first/last is allowed. Tab key is left to the browser (it leaves the tablist naturally because only the active tab has `tabIndex=0`).
- [X] T035 [US4] In `components/StatsTabs.tsx`, ensure focus management: when a tab is activated by Arrow/Home/End, the `<button>` element's `.focus()` is called explicitly so the user's focus follows. When activation comes from `hashchange` (external) or programmatic `setActiveTab`, focus is NOT moved (would steal focus during typing/back-button).

**Checkpoint**: WCAG 2.1 AA keyboard + ARIA acceptance scenarios pass.

---

## Phase 7: User Story 5 — Faster initial paint via lazy panel mounting (Priority: P3)

**Goal**: Inactive tab panels are not in the DOM until first activation; switching to Performance renders its charts within budget.

**Independent Test**: Inspect the rendered page on Overview load — only Overview panels in the DOM. Click Performance — Performance panels mount and render. Click Overview — Performance panels unmount.

### Tests for User Story 5

- [X] T036 [P] [US5] In `tests/integration/stats-tabs.test.tsx`, BDD test for US5 #1: render page → assert (via `screen.queryByTestId` or role queries) that no Performance, Weaknesses, History, or Gamification panel is in the DOM. Only Overview panels are queryable.
- [X] T037 [P] [US5] In `tests/integration/stats-tabs.test.tsx`, BDD test for US5 #2: click Performance → Performance chart elements appear in the DOM. (The 500ms timing budget is a runtime metric not asserted in jsdom.)

### Implementation for User Story 5

- [X] T038 [US5] In `components/StatsTabs.tsx`, the lazy-mount logic `{tabId === activeTab && children}` inside `<TabPanel>` is already in place from T005. Confirm by code review that there is no `display: none` fallback that would mount-but-hide. The contract default is unmount-on-hide; the `display: none` fallback is reserved for follow-up if profiling shows a budget violation (see plan.md Performance Goals).

**Checkpoint**: Initial paint is no slower than baseline; tab switches stay under 500ms in real browsers.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Anything that touches multiple user stories, plus pre-push gate.

- [ ] T039 Run `npm run lint` — must be clean. Fix any new warnings introduced by the new files.
- [ ] T040 Run `npm test -- --coverage` — all tests pass; coverage on `components/StatsTabs.tsx` and `lib/stats-tabs.ts` ≥ 80% on both lines and branches per Constitution II.
- [ ] T041 Run `npx tsc --noEmit` — clean.
- [ ] T042 Run `npm run build` — clean. Compare gzipped JS payload of the `/stats` route vs master baseline; MUST stay within +5KB envelope (plan.md Performance Goals).
- [ ] T043 [P] Update `CHANGELOG.md`: new heading `## [1.17.0] — 2026-05-29` with `### Changed` summarising the tabbed reorganisation, `### Added` for `<StatsTabs>` + `lib/stats-tabs.ts`, and `### Notes` confirming no schema or backend changes.
- [ ] T044 Manual smoke test against the dev server: walk every step of `quickstart.md` § "Manual smoke test" in a real browser. Specifically verify (a) deep-link works without flash, (b) prefers-reduced-motion makes tab switches instant, (c) deletion-undo persists across tab switches, (d) 320px viewport scrolls correctly.
- [ ] T045 Run the four review sub-agents in parallel per CLAUDE.md Phase 2 quality gate: `test-engineer`, `code-reviewer`, `accessibility-auditor`, `security-auditor`. Address any Critical/High findings; defer Medium to follow-up issues if cheap; ignore Low advisories. Re-run quality gate from the top after fixes (max 3 cycles).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately on the new branch.
- **Foundational (Phase 2)**: depends on Setup. BLOCKS all user stories.
- **User Stories (Phase 3+)**: each story can start once Foundational is done.
  - US1 is the MVP and recommended first.
  - US2, US3, US4, US5 are independent of one another in principle, but in practice US3 (mobile scroll) reuses the keyboard handler from Phase 2 and US4 (keyboard) reuses the same handler — sequencing them after US1 is the cleanest path.
- **Polish (Phase 8)**: depends on all five stories complete.

### User Story Dependencies

- **US1 (P1)**: depends only on Foundational.
- **US2 (P2)**: depends on Foundational. Touches only `<StatsTabs>` + `lib/stats-tabs.ts`. Independent of US1's panel content.
- **US3 (P2)**: depends on Foundational. Adds CSS + scroll behaviour; independent of US1/US2 panel content.
- **US4 (P2)**: depends on Foundational. Refines keyboard handler from T006; can be implemented without US1 panels in place.
- **US5 (P3)**: depends on Foundational. Lazy-mount is already implemented in T005; this phase is mostly verification + tests.

### Within Each User Story

- Tests MUST be written and FAIL before implementation per Constitution II.
- Within Foundational: T003 (lib) before T004 (lib tests can fail-then-pass); T005 (primitive) before T006 (keyboard) before T007 (assembled `<StatsTabs>`).
- Within US1: T008–T010 (tests) before T011–T017 (implementation).
- Same pattern for US2 / US3 / US4 / US5.

### Parallel Opportunities

- T002 alongside T001.
- T008, T009, T010 (US1 tests) — different `describe` blocks in the same file but no inter-test dependency; can be authored in parallel.
- T018–T021 (US2 tests) — same.
- T025, T026 (US3 tests) — same.
- T030–T033 (US4 tests) — same.
- T036, T037 (US5 tests) — same.
- T043 alongside T039–T042 (CHANGELOG is independent of code).
- T045: the four review sub-agents MUST be spawned in parallel per CLAUDE.md.

---

## Parallel Example: User Story 1

```text
# Tests for User Story 1 (write first; all live in tests/integration/stats-tabs.test.tsx):
- T008 [P] [US1] BDD test US1 #1 — default tab + content
- T009 [P] [US1] BDD test US1 #2 — clicking switches panels
- T010 [P] [US1] BDD test US1 #3 — header/toasts persist

# Panel definitions for User Story 1 (different sections of components/StatsTabs.tsx):
- T011 [US1] Overview panel
- T012 [US1] Gamification panel
- T013 [US1] Performance panel
- T014 [US1] Weaknesses panel
- T015 [US1] History panel
```

T011–T015 are not marked [P] because they all live in the same file (`components/StatsTabs.tsx`); they should be done sequentially or as one logical group.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 User Story 1
4. STOP and validate: open `/stats` in a browser; click each tab; confirm panel content is correct; ARIA + keyboard works (already implemented in foundation but only really exercised here).
5. The MVP could ship at this point as a tabbed page with no deep-linking and no auto-scroll — but in practice US2/US3/US4 are tiny incremental costs once the foundation exists; ship them together.

### Incremental Delivery

1. Foundational (Phase 2) — primitive + lib are usable but the page still uses the old layout.
2. US1 — page switches to tabs. (Could ship here; functional MVP.)
3. US2 — deep-linkable and sticky. (Independent ship.)
4. US3 — mobile-correct. (Independent ship.)
5. US4 — keyboard + a11y polish. (Independent ship.)
6. US5 — confirm lazy-mount. (Mostly a test + measurement task.)
7. Polish — quality gate + CHANGELOG.

### Parallel Team Strategy

Single-developer project — N/A. All phases run sequentially in priority order.

---

## Notes

- [P] tasks within a phase = different files, no in-phase dependency.
- [Story] label maps the task to its user story for traceability.
- Every user story is independently testable from `<StatsTabs>` plus seeded data.
- Verify tests fail before implementing (Constitution II).
- Commit after each phase or logical group; do not amend post-push.
- Quality gate (T045) MUST pass before any push to GitHub per CLAUDE.md.
