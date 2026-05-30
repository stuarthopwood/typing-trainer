# Feature Specification: Tabbed Stats Page Reorganisation

**Feature Branch**: `015-stats-tabbed-reorg`

**Created**: 2026-05-29

**Status**: Draft

**Input**: User description: "Tabbed stats page reorganisation: split the existing single-scroll /stats page into 5 tabs — Overview, Gamification, Performance, Weaknesses, History."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discoverable, themed stats sections (Priority: P1)

As a typing-trainer user, when I open my stats page I want each piece of information grouped under a clearly-labelled theme so I can find what I came for in seconds, instead of scrolling past 13 panels in a single column to reach the one chart I actually wanted.

**Why this priority**: Today the stats page is a 400-line single scroll with 13+ heterogeneous panels. New visitors don't know what's there; returning visitors scroll past everything every time. Themed tabs are the smallest change that turns the page from a dump into a dashboard.

**Independent Test**: Open `/stats` with seeded session data. Five tabs are visible (Overview / Gamification / Performance / Weaknesses / History). The active tab shows only its own panels. Clicking another tab swaps the panels visible. Test passes when each tab shows the expected panel set and no panel from another tab is visible.

**Acceptance Scenarios**:

1. **Given** a user with at least one completed session, **When** they navigate to `/stats`, **Then** they see five tab labels and the Overview tab is active by default, showing the big stat row, recent sessions list, and AI tips.
2. **Given** a user is viewing the Overview tab, **When** they click the "Performance" tab, **Then** the Overview content is replaced by the Performance content (Personal Bests, Finger Load, Weekly Digest, Analytics Summary, Deep Analytics, WPM chart, Accuracy chart) and no Overview panels remain visible.
3. **Given** a user is on any tab, **When** they look at the page, **Then** the header (back arrow + "Stats" title + logout button) and any active deletion-undo toasts remain visible regardless of tab.

---

### User Story 2 - Deep-linkable and persistent tab state (Priority: P2)

As a user who wants to share or bookmark a specific section of my stats (e.g. "look at my error heatmap"), I want a URL that opens directly to that tab; and as a returning user I want the page to remember the last tab I was viewing.

**Why this priority**: Without deep-linking, every link to `/stats` lands on Overview and the user must navigate manually. Without persistence, every visit resets the user's exploration. Both undermine the discoverability win from User Story 1, but the page is still useful without them.

**Independent Test**: Visit `/stats#weaknesses` directly — the Weaknesses tab is active immediately. Click the Performance tab, navigate away, then click "Stats" again from the home page (no hash) — Performance is the active tab.

**Acceptance Scenarios**:

1. **Given** a user pastes `/stats#performance` into the address bar, **When** the page loads, **Then** the Performance tab is active and its content is rendered.
2. **Given** a user is on the Weaknesses tab, **When** they navigate to home and then back to `/stats` (no hash), **Then** the Weaknesses tab is still active.
3. **Given** the URL hash names an unknown tab (e.g. `/stats#nonsense`), **When** the page loads, **Then** the Overview tab is shown as a safe default (no error, no blank screen).
4. **Given** a user clicks a tab, **When** the click completes, **Then** the URL hash updates to match the tab and the value is recorded for next-visit persistence.

---

### User Story 3 - Mobile-friendly tab navigation (Priority: P2)

As a phone user, I want to use the tabbed stats page on a 320px-wide screen without losing tap-target size or having tabs disappear off the side of the screen.

**Why this priority**: NeuralKeys is mobile-friendly per project design rules. Five tabs at comfortable 44px tap targets do not fit horizontally on small screens.

**Independent Test**: Open `/stats` on a 320px viewport. The tab bar shows the leftmost tabs and overflows horizontally. Each tab is at least 44px tall and tappable. Swiping the tab bar horizontally reveals further tabs. Switching to a tab that was off-screen scrolls that tab into view automatically.

**Acceptance Scenarios**:

1. **Given** a 320px viewport, **When** the page loads, **Then** the tab bar is a single row with horizontal overflow scrolling, every tab is at least 44×44px, and the active tab is fully visible (auto-scrolled into view if it would otherwise be off-screen).
2. **Given** the user is on Overview, **When** they activate the History tab via the tab bar, **Then** the tab bar scrolls so History is fully in view, even if it was off-screen before.

---

### User Story 4 - Keyboard-only and screen-reader navigation (Priority: P2)

As a keyboard-only user or assistive-technology user, I want to navigate between tabs using standard keyboard conventions (arrow keys to move between tabs, Home/End to jump, Tab to enter the active panel), with correct ARIA roles announced so screen readers describe the structure.

**Why this priority**: Constitution Principle VI mandates WCAG 2.1 AA. Tabs without correct keyboard semantics fail the standard. This is non-negotiable for a feature that introduces tabs.

**Independent Test**: Tab into the tab list with the keyboard. Pressing ArrowRight/ArrowLeft moves focus and activation between tabs. Home/End jump to the first/last tab. Tabbing again leaves the tab list and enters the active tab's panel. A screen reader announces "tab list", each tab name with selected/not-selected state, and "tab panel" when entering content.

**Acceptance Scenarios**:

1. **Given** keyboard focus is on the active tab, **When** the user presses ArrowRight, **Then** focus and activation move to the next tab; ArrowLeft moves to the previous tab. Wrap-around between first/last is acceptable.
2. **Given** keyboard focus is on any tab, **When** the user presses Home, **Then** focus moves to the first tab and activates it; End moves to the last tab.
3. **Given** a screen reader is active, **When** the user navigates the tab list, **Then** each tab is announced with its name and selected/unselected state, and the active panel is announced as a "tab panel" labelled by its tab.

---

### User Story 5 - Faster initial paint via lazy panel mounting (Priority: P3)

As any user, I want the stats page to feel snappy on first paint and on tab switches, with charts only being mounted when their tab becomes visible.

**Why this priority**: Today, all 13 panels — including 6+ chart components from `recharts` — mount on initial render. Lazy mounting only the active panel measurably reduces first-paint time. Nice-to-have; the feature is still valuable without it, but enabling it costs little once tabs exist.

**Independent Test**: With instrumentation, record the time-to-interactive on Overview. It should be measurably faster than the pre-tab page on the same dataset. Switching to Performance for the first time renders its charts; switching back to Overview keeps Performance unmounted (or, if remount-cost is too high, mounted-but-hidden — see Assumptions).

**Acceptance Scenarios**:

1. **Given** a user lands on Overview, **When** the page renders, **Then** the panels for Performance, Weaknesses, History, and Gamification are not in the DOM (their components are not mounted).
2. **Given** a user is on Overview, **When** they click "Performance", **Then** the Performance panels mount and render within 500ms (with seeded data).

---

### Edge Cases

- **No data yet**: A brand-new user with zero sessions sees the tabs but most tab contents would be empty. Each tab must show a sensible empty state (e.g. "No sessions yet — complete a session to see your performance trends") rather than blank panels.
- **Insufficient data thresholds**: Several panels have minimum-data gates today (e.g. WPM/Accuracy charts need ≥2 sessions, AnalyticsSummary needs ≥3, DeepAnalytics needs ≥5, WeeklyDigest needs ≥3, Bigrams need bigram metadata, Heatmap/ErrorDistribution need errors). When a tab contains only data-gated panels and none qualify, the tab must show an empty state — not render to nothing.
- **Hash-only-without-localStorage availability**: If localStorage is unavailable (private mode, blocked), tab persistence falls back to "always start on Overview" but URL-hash deep linking still works.
- **Hash with hidden tabs**: If the user deep-links to a tab whose panels are all empty (e.g. `/stats#weaknesses` with no errors recorded), the tab is still active and shows its empty state.
- **Pending deletion across tabs**: A user starts a session deletion (the undo toast is showing) and switches tabs. The undo toast remains visible and operable; expiry still occurs at the 5-second mark; on undo, the session reappears in the Overview Recent Sessions list when that tab is next viewed.
- **Reduced motion**: Users with `prefers-reduced-motion` see tab transitions with no animation (e.g. no fade or slide); the content is replaced instantly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `/stats` page MUST present its content as five named tabs in this order: Overview, Gamification, Performance, Weaknesses, History.
- **FR-002**: The page MUST render exactly one tab's panels at a time. Inactive tab panels MUST NOT be visible.
- **FR-003**: The Overview tab MUST contain: the big-stat row (Sessions / Best WPM / Best Accuracy / Day Streak / Avg WPM), the Recent Sessions list (with delete-with-undo), and the AI Tips list.
- **FR-004**: The Gamification tab MUST contain: Streak Calendar, Badge Gallery, Nemesis Card, Daily Challenge stats.
- **FR-005**: The Performance tab MUST contain: Personal Bests, Finger Load, Weekly Digest, Analytics Summary, Deep Analytics, WPM chart, Accuracy chart.
- **FR-006**: The Weaknesses tab MUST contain: Keyboard Heatmap (with case toggle), Error Distribution, slow-Bigrams chart.
- **FR-007**: The History tab MUST contain: Sessions per Week, Mode Breakdown.
- **FR-008**: The active tab MUST be reflected in the URL fragment (hash) using a stable slug per tab (`overview`, `gamification`, `performance`, `weaknesses`, `history`).
- **FR-009**: Visiting `/stats` with a recognised hash MUST activate the matching tab on initial render. Visiting with no hash or an unrecognised hash MUST fall back to the persisted last-tab (if any) or to Overview.
- **FR-010**: Switching tabs MUST update both the URL hash (without a full page reload) and a localStorage key recording the last-active tab.
- **FR-011**: The tab list MUST be operable by keyboard following WAI-ARIA Authoring Practices for tabs: ArrowRight/ArrowLeft move and activate adjacent tabs, Home/End jump to first/last, Tab moves focus into the active panel.
- **FR-012**: The tab list and panels MUST use ARIA roles `tablist`, `tab`, and `tabpanel`, with `aria-selected` on the active tab and `aria-controls`/`aria-labelledby` linking tabs to panels.
- **FR-013**: Each tab MUST present a tap target of at least 44×44 CSS pixels on touch devices.
- **FR-014**: On viewports narrower than the tab bar's natural width, the tab bar MUST overflow horizontally with native scroll. Activating an off-screen tab MUST scroll that tab into view.
- **FR-015**: Tab transitions MUST respect the user's `prefers-reduced-motion` preference. Animations (if any) MUST be omitted when motion is reduced.
- **FR-016**: Inactive tab panels MUST NOT be mounted in the DOM until first activation. After first activation, an unmounted-on-hide policy is acceptable; mounted-but-hidden is also acceptable provided initial paint cost is no worse than the pre-feature baseline. (See Assumptions for the rationale.)
- **FR-017**: The page header (back arrow, "Stats" title, logout) MUST remain visible and operable across all tabs.
- **FR-018**: A pending session-deletion undo toast MUST remain visible and operable across tab switches; deletion expiry continues to fire at the 5-second mark regardless of tab.
- **FR-019**: A tab whose panels are all empty (no qualifying data) MUST display an empty-state message describing what's missing and how to populate it; the tab itself MUST still be selectable.
- **FR-020**: No backend or persisted-data schema changes are introduced. Progress and session storage formats are unchanged.

### Key Entities

- **Tab**: a named section of the stats page. Attributes: stable slug (used in URL hash and localStorage), display label, icon, panel set.
- **Active-tab record (localStorage)**: a single string under a stable key (e.g. `nk-stats-active-tab`) holding the last-activated tab slug. Read on page load when no URL hash is present; written on every tab activation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can locate any specific stats panel in 5 seconds or less by selecting the correct tab, given the panel's content theme. (Compared to today's "scroll until you find it" baseline.)
- **SC-002**: The Overview tab's first contentful paint, on seeded data, is at least as fast as the pre-feature stats page baseline measured on the same dataset.
- **SC-003**: 100% of tabs are reachable and operable using only keyboard input, with correct ARIA states announced by a screen reader.
- **SC-004**: 100% of tabs pass WCAG 2.1 AA contrast for label text in both selected and unselected states.
- **SC-005**: A direct link of the form `/stats#<slug>` opens directly to that tab on a fresh page load, with no flash of the wrong tab.
- **SC-006**: A user who selects the Performance tab and then revisits `/stats` (no hash) on the same device, in the same browser, lands on Performance.
- **SC-007**: The page renders correctly and remains operable on a 320px-wide viewport: tab bar overflows horizontally with native scroll, all tap targets are ≥ 44×44 CSS pixels.

## Assumptions

- **No backend changes**: this is a pure UI restructure of `app/stats/page.tsx`. Progress, session storage, and all underlying data sources are unchanged.
- **Existing component reuse**: every panel component already exists (StreakCalendar, BadgeGallery, NemesisCard, DailyChallengeStats, PersonalBestsCard, FingerLoadCard, WeeklyDigestCard, AnalyticsSummary, DeepAnalytics, WpmChart, AccuracyChart, KeyboardHeatmap, ErrorDistribution, BigramChart, SessionsPerWeek, ModeBreakdown). No new chart or data component is introduced.
- **Lazy mount default**: the unmount-on-hide approach is the default, accepted as a small chart-remount cost on tab switch in exchange for a simpler implementation. If profiling later shows tab-switch latency on Performance/Weaknesses exceeds 500ms on the same device class, the policy may be relaxed to "mount on first activation, keep mounted".
- **Single-row mobile tab bar**: 5 tabs in a horizontally-scrollable row is the chosen mobile pattern. A `<select>` fallback is not introduced unless a future user-test reveals discoverability problems with off-screen tabs.
- **No analytics events**: this restructure does not introduce new analytics/telemetry events. (Tab usage instrumentation is a follow-up if later data is needed.)
- **No transitions on first paint**: any tab-switch transition (if added) is omitted on initial render and when `prefers-reduced-motion: reduce`.
- **Session deletion + undo unaffected**: existing undo behaviour stays as-is, including the ability to switch tabs while a deletion is pending. Restoration on undo updates the Recent Sessions list on Overview the next time it is rendered (re-mounts re-read from state).
- **Logout button remains in header**: not duplicated per tab. The header is the persistent shell; tabs swap only the content area below.
