# Phase 1 Data Model: Tabbed Stats Page Reorganisation

**Feature**: `015-stats-tabbed-reorg` · **Date**: 2026-05-29

This feature is a UI restructure. There is **no persisted data schema change**: progress, sessions, badges, streaks, and Vercel Blob shapes are all untouched. The "data model" here covers the small in-memory and localStorage state introduced for tab navigation.

---

## TabSlug (string union)

The set of recognised tab identifiers. Used in URL hash, localStorage, and component props.

```ts
export type TabSlug =
  | 'overview'
  | 'gamification'
  | 'performance'
  | 'weaknesses'
  | 'history';
```

**Rationale**: a closed string union gives compile-time exhaustiveness in switch/match logic and keeps the source-of-truth in one place.

---

## Tab (descriptor)

Static metadata for one tab. The list of `Tab` records is the only place the tab order, labels, and icons are defined.

```ts
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface Tab {
  /** stable slug — used in URL hash, localStorage, and `aria-controls`/`id` linkage */
  readonly slug: TabSlug;
  /** human-readable label rendered inside the tab button */
  readonly label: string;
  /** FontAwesome icon shown to the left of the label */
  readonly icon: IconDefinition;
}
```

**Validation rules**:
- `slug` MUST be unique within the list of tabs.
- `slug` MUST satisfy `/^[a-z][a-z0-9-]{0,30}$/`.
- `label` MUST be non-empty and ≤ 20 characters (so the tab fits comfortably on mobile alongside its icon).

**Lifecycle**: constants. Defined once at module scope in `components/StatsTabs.tsx`. Never mutated at runtime.

---

## ActiveTabRecord (localStorage)

Persists the user's last-activated tab so they return to the same view next visit.

| Field | Type | Storage | Notes |
|---|---|---|---|
| key | string | hard-coded | `'nk-stats-active-tab'` — `nk-` namespace prefix follows existing localStorage conventions in the project. |
| value | `TabSlug` | string | Validated against the `TabSlug` union on read; unrecognised values are treated as if absent. |

**Read path** (executed once per page load, in `resolveInitialTab()`):
1. URL hash takes priority — if `location.hash` (without leading `#`) matches a `TabSlug`, that wins.
2. Otherwise, read `localStorage.getItem('nk-stats-active-tab')`. If it parses as a `TabSlug`, use it.
3. Otherwise, fall back to `'overview'`.

**Write path** (executed on every tab activation):
1. `localStorage.setItem('nk-stats-active-tab', slug)` — best-effort. Failure is silently swallowed (private mode, quota, etc.). Tab activation still proceeds.
2. `history.replaceState(null, '', '#' + slug)` — updates the URL hash without creating a back-stack entry.

**Removal**: never. The record is a single string, ~20 bytes, and removal would force any user who logs out via the existing logout flow to lose tab preference unnecessarily. The existing logout path (`clearUserPin()` + `localStorage.removeItem('typing-trainer-progress')`) does not touch this key, which is correct: logout is about identity, not UI state.

---

## State machine: active tab

There is exactly one piece of mutable UI state introduced: `activeTab: TabSlug`. Transitions:

```text
            click / Arrow / Home / End / hashchange
                            │
   ┌─────────┐      ┌─────────────────────┐       ┌─────────────┐
   │  init   │ ───▶ │   activeTab: slug   │ ────▶ │  re-render  │
   └─────────┘      └─────────────────────┘       └─────────────┘
                            │  side effects
                            │
                            ▼
                  history.replaceState(#slug)
                  localStorage.setItem(key, slug)
                  scrollIntoView(activeTabEl)   (if not fully visible)
```

**Initial state**: `resolveInitialTab()` is called once in a lazy `useState` initialiser. See `research.md` for the SSR-safe pattern.

**Allowed transitions**: any `TabSlug` may transition to any other `TabSlug` at any time. There are no forbidden orderings, no preconditions, and no async barriers.

**Invariant**: at all times, exactly one tab is active. The renderer MUST NOT allow two tabpanels to be visible at once.

---

## Cross-tab interaction with existing state

The Stats page already maintains:

- `progress: ProgressData | null` — global progress snapshot loaded once.
- `allSessions: EnrichedSessionSummary[]` — full session list loaded async after migration.
- `loadingHistory: boolean` — async load gate.
- `heatmapCase: HeatmapCase` — `'lower'` or `'upper'` for the keyboard heatmap.
- `pendingDeletes: Record<string, EnrichedSessionSummary>` — sessions in their 5s undo window.
- `deleteError: string | null` — toast for failed deletions.

**None of this state moves into the Tab record**. The tabs are purely a presentational wrapper. State that was scoped to the page stays scoped to the page; it remains live across tab switches because the page itself does not unmount when the user clicks a tab. Only the *panels* unmount/remount.

The one consequence to call out:

- **`heatmapCase`** is only meaningful when the Weaknesses tab is visible (KeyboardHeatmap lives there). Today it lives on the page; it stays on the page so its choice is preserved if the user toggles to a different tab and back. No move needed.

---

## No new persisted-data types

For completeness:

- No new fields in `ProgressData`.
- No new fields in `SessionSummary` / `EnrichedSessionSummary`.
- No new fields in `Tip` / `Badge` / `NemesisRecord` / `PersonalBests` / `WeeklyDigest` / `DailyChallengeRecord`.
- No new Vercel Blob keys.
- No new API routes.

---

## Summary

| Entity | Where it lives | Mutability |
|---|---|---|
| `TabSlug` | `lib/stats-tabs.ts` (type) | constant |
| `Tab` records | `components/StatsTabs.tsx` (module-scope const) | constant |
| `ActiveTabRecord` | `localStorage['nk-stats-active-tab']` | written on every tab activation |
| `activeTab` (React state) | `app/stats/page.tsx` | one `useState` |

That's the entirety of the new data model. No migrations, no schema changes, no API additions.
