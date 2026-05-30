# Contract: `<StatsTabs>` and `<Tabs>` Primitive

**Feature**: `015-stats-tabbed-reorg` · **Date**: 2026-05-29

This document is the **contract** between `app/stats/page.tsx` and the new tab primitive. Anything not captured here is implementation detail and may change.

---

## 1. The generic primitive — `<Tabs>` / `<TabList>` / `<Tab>` / `<TabPanel>`

A small first-party building block. Lives at `components/StatsTabs.tsx` alongside the assembled `<StatsTabs>`. Public surface:

```tsx
type TabId = string;

interface TabsProps {
  /** identifier of the active tab */
  activeTab: TabId;
  /** called when the user activates a different tab — by click, arrow keys, Home/End, or hashchange */
  onChange: (tab: TabId) => void;
  /** rendered children: should contain one <TabList> and one <TabPanel> per Tab */
  children: React.ReactNode;
}

interface TabListProps {
  /** accessible name of the tab list — required */
  ariaLabel: string;
  children: React.ReactNode;
}

interface TabProps {
  /** stable id matching the corresponding TabPanel.tabId */
  tabId: TabId;
  children: React.ReactNode;
}

interface TabPanelProps {
  /** stable id matching the corresponding Tab.tabId */
  tabId: TabId;
  children: React.ReactNode;
}
```

### ARIA contract

- `<TabList>` MUST render an element with `role="tablist"` and `aria-label={ariaLabel}`.
- Each `<Tab>` MUST render a `<button type="button">` with:
  - `role="tab"`
  - `id={`stats-tab-${tabId}`}`
  - `aria-controls={`stats-panel-${tabId}`}`
  - `aria-selected={tabId === activeTab}`
  - `tabIndex={tabId === activeTab ? 0 : -1}`
- Each `<TabPanel>` MUST render a `<div>` with:
  - `role="tabpanel"`
  - `id={`stats-panel-${tabId}`}`
  - `aria-labelledby={`stats-tab-${tabId}`}`
  - `tabIndex={-1}` (panels contain their own focusable children)
  - `hidden` attribute set when `tabId !== activeTab` (and the panel SHOULD NOT be mounted at all when not active — see § 3)

### Keyboard contract

When focus is inside the `<TabList>`:

| Key | Effect |
|---|---|
| `ArrowRight` / `ArrowDown` | Move focus + activation to next tab; wraps from last → first. |
| `ArrowLeft` / `ArrowUp` | Move focus + activation to previous tab; wraps from first → last. |
| `Home` | Move focus + activation to first tab. |
| `End` | Move focus + activation to last tab. |
| `Tab` | Move focus into the active panel (or to the next focusable element in the document if the panel has none). |

Activation is **automatic** (active tab follows focus), per the WAI-ARIA APG manual-activation pattern for content that is cheap to render. (Charts in inactive panels do not render anyway, so the cost is bounded.)

### Visual contract

- Active tab: text colour `text-[#00ff88]`, bottom border 2px `#00ff88`. Matches the existing accent used elsewhere in the app.
- Inactive tab: text colour `text-neutral-400`, bottom border 2px `transparent`.
- Hover (mouse): inactive tab text becomes `text-neutral-200`.
- Focus-visible: all tabs gain a 2px `ring-[#00ff88]/60` offset ring per existing focus-ring conventions. `outline: none` is forbidden without this replacement.
- Tap target: each tab MUST measure ≥ 44 × 44 CSS pixels (padding + line-height add up to this; tested via DOM measurement in the integration tests).
- Selected and unselected text contrast on the dark background MUST satisfy WCAG 2.1 AA (≥ 4.5:1). Both `#00ff88` on `#0d0d0d` and `text-neutral-400` on `#0d0d0d` clear this with margin.

---

## 2. The assembled `<StatsTabs>`

`<StatsTabs>` is the `/stats` page's tab assembly: it composes `<Tabs>` with the five tab descriptors and renders the panels.

```tsx
interface StatsTabsProps {
  // The data already loaded by the page; passed through to panels.
  progress: ProgressData;
  sessions: EnrichedSessionSummary[];
  loadingHistory: boolean;

  // Heatmap case toggle — preserved across tab switches.
  heatmapCase: HeatmapCase;
  onHeatmapCaseChange: (next: HeatmapCase) => void;

  // Recent-sessions deletion plumbing — passed down to Overview panel.
  onDeleteSession: (session: EnrichedSessionSummary) => void;
}
```

### Internal behaviour

- `<StatsTabs>` owns the `activeTab` state via `useState(() => resolveInitialTab())`.
- `<StatsTabs>` registers a `hashchange` window listener on mount; on event, it calls `setActiveTab(parsedSlugOrDefault)` so external hash changes (back/forward, paste) are honoured.
- On every `setActiveTab(slug)` (whether triggered internally or by hashchange), `<StatsTabs>` calls:
  - `writePersistedTab(slug)` — `localStorage.setItem`
  - `history.replaceState(null, '', '#' + slug)` — only when the new slug differs from `location.hash` to avoid feedback loops with hashchange
  - `scrollActiveTabIntoView()` — only if the active tab element is not fully within the tablist's bounds; uses `scrollIntoView({ inline: 'center', block: 'nearest', behavior })` where `behavior` respects `prefers-reduced-motion`.
- Lazy panel mount: each `<TabPanel>` renders its children **only when `tabId === activeTab`**. Implementation: `{tabId === activeTab && children}` inside `<TabPanel>`. Switching tabs unmounts the previous panel.

### Tab → panel mapping (from spec FR-003 through FR-007)

| Tab slug | Panels (in render order) |
|---|---|
| `overview` | Big-stat row (Sessions / Best WPM / Best Accuracy / Day Streak / Avg WPM); Recent Sessions list (with delete-with-undo); AI Tips list. |
| `gamification` | StreakCalendar; BadgeGallery; NemesisCard (gated by errorHeatmap); DailyChallengeStats. |
| `performance` | PersonalBestsCard (gated by sessions.length > 0); FingerLoadCard (gated by errorHeatmap); WeeklyDigestCard (gated by sessions.length ≥ 3); AnalyticsSummary (gated ≥ 3); DeepAnalytics (gated ≥ 5); WpmChart (gated ≥ 2); AccuracyChart (gated ≥ 2). |
| `weaknesses` | KeyboardHeatmap with case toggle (gated by errorHeatmap); ErrorDistribution (gated by errorHeatmap); BigramChart (gated by hasBigramData). |
| `history` | SessionsPerWeek (gated ≥ 2); ModeBreakdown. |

Each panel respects its existing data gate; if **all** panels in a tab are gated out, the tab renders an empty-state message (see FR-019).

---

## 3. Lazy mount

**Default**: `{tabId === activeTab && children}` inside `<TabPanel>`. Switching tabs unmounts the previous panel and mounts the new one.

**Performance budget**: tab switch from Overview to Performance, with seeded data of up to 50 sessions, must render within 500ms on a mid-range laptop (acceptance scenario US-5 #2). If profiling later shows this is exceeded — most likely on Performance because it has 7 charts — the policy MAY be relaxed to `mount-on-first-activation, keep mounted` by replacing the conditional with `style={{display: tabId === activeTab ? undefined : 'none'}}` in a follow-up. The contract here is "appears within 500ms", not a specific mount strategy.

---

## 4. Lib helpers — `lib/stats-tabs.ts`

Public exports:

```ts
export type TabSlug = 'overview' | 'gamification' | 'performance' | 'weaknesses' | 'history';

/** parse a hash string (with or without leading '#') into a TabSlug; returns null if unrecognised */
export function parseTabSlug(hash: string | undefined | null): TabSlug | null;

/** read the persisted tab from localStorage; returns null if absent or invalid */
export function readPersistedTab(): TabSlug | null;

/** write the persisted tab; failures are swallowed */
export function writePersistedTab(slug: TabSlug): void;

/** resolve the initial tab on first render: hash > localStorage > 'overview' */
export function resolveInitialTab(): TabSlug;
```

### Behaviour contract

- `parseTabSlug` MUST be O(1) and pure. Trims a leading `#` if present. Returns the input unchanged if it matches a known slug; otherwise `null`.
- `readPersistedTab` MUST tolerate the absence of `window`/`localStorage` (returns `null` silently). It MUST validate the read value against the `TabSlug` union and reject anything else.
- `writePersistedTab` MUST tolerate `localStorage` write failure (private mode, quota). No throw.
- `resolveInitialTab` MUST be safe to call during SSR — it returns `'overview'` when `typeof window === 'undefined'`.

### Test contract

These four functions MUST have unit tests in `tests/components/StatsTabs.test.tsx` (or a sibling `tests/stats-tabs.test.ts` if the file grows). At minimum:

- `parseTabSlug`: each known slug round-trips; `''`, `'#'`, `'unknown'`, `'overview/extra'`, `null`, `undefined` all return `null`.
- `readPersistedTab`: returns `null` when absent; returns the slug when present-and-valid; returns `null` when present-but-invalid; returns `null` when localStorage throws (mocked).
- `writePersistedTab`: writes the value when localStorage works; does not throw when it doesn't.
- `resolveInitialTab`: hash wins over storage; storage wins over default; default `'overview'` when both missing; SSR-safe.

---

## 5. Test contract for `<StatsTabs>`

Integration tests in `tests/integration/stats-tabs.test.tsx` MUST cover, with Given/When/Then comments, every acceptance scenario in `spec.md`:

- US-1 #1: default tab on entry.
- US-1 #2: clicking switches panels.
- US-1 #3: header + toasts persistent across tabs.
- US-2 #1: deep-link `/stats#performance`.
- US-2 #2: persistence across no-hash visits.
- US-2 #3: unknown hash falls back to overview.
- US-2 #4: clicking updates URL and storage.
- US-3 #1: 320px viewport — scrollable tab bar, ≥ 44px tap targets.
- US-3 #2: activating off-screen tab scrolls it into view (assert `scrollIntoView` called with the right options; jsdom doesn't actually scroll).
- US-4 #1: ArrowRight/Left activation.
- US-4 #2: Home/End jumps.
- US-4 #3: ARIA roles + selected/unselected announcements (assert via DOM attributes).
- US-5 #1: inactive panels are not in the DOM.
- US-5 #2: switching to Performance renders its charts (we assert they're mounted; the 500ms budget is a runtime metric not asserted in jsdom).

Edge cases MUST also be covered:

- Empty data — no sessions, no heatmap, no tips.
- localStorage unavailable (`Storage.prototype.setItem` mocked to throw).
- `prefers-reduced-motion: reduce` matched (assert `scrollIntoView` called with `behavior: 'auto'`).
- Pending deletion across tab switch — undo toast remains visible after switching tabs and back; expiry still fires.

---

## 6. What is **not** in this contract

- Visual styling beyond the active/inactive accent and focus ring is left to the implementation. Designers can iterate without breaking the contract.
- The exact text content of empty-state messages is not fixed here — only that each gated-out tab MUST show one (FR-019).
- The timing curve of any tab-switch animation, if added later, is out of scope. The contract requires only that motion be omitted when `prefers-reduced-motion` is set.
- Analytics/telemetry hooks for tab usage are not in scope (see Assumptions in spec.md).
