# Phase 0 Research: Tabbed Stats Page Reorganisation

**Feature**: `015-stats-tabbed-reorg` · **Date**: 2026-05-29

This document resolves all open technical questions before design (Phase 1). Spec contained zero `[NEEDS CLARIFICATION]` markers, so research focused on three implementation choices that materially affect bundle size, accessibility correctness, and mobile behaviour.

---

## Decision 1: Tab implementation — first-party primitive vs library

**Decision**: Build a small first-party `<Tabs>` primitive in `components/StatsTabs.tsx` (~80 lines incl. ARIA + keyboard + scrollIntoView). Do NOT pull in `@headlessui/react` or `@radix-ui/react-tabs`.

**Rationale**:
- Bundle budget: Constitution sets a 250KB gzipped initial-JS budget. `@headlessui/react` ships ~12KB gzipped; `@radix-ui/react-tabs` ships ~10KB. The custom primitive is < 1KB after Tailwind class extraction.
- KISS (Constitution Principle IV): a 5-tab list with no nested tabs, no popovers, no menus — the surface area of either library is overkill.
- Test isolation: a first-party primitive can be exercised at unit level without wrapping the library's renderer. Coverage on the primitive is straightforward.
- Future extensibility: if the project later needs tabs in three more places, *that* is when extracting a generic `<Tabs>` lib pays for itself. Today it doesn't.

**Alternatives considered**:
- **`@headlessui/react`**: well-tested ARIA, used elsewhere in the React ecosystem. Rejected: extra runtime weight, transitive `@tanstack/react-virtual` dep family, and React 19 compat lag history.
- **`@radix-ui/react-tabs`**: best-in-class a11y, slightly smaller than headless-ui. Rejected: still doubles the cost of writing the right ARIA ourselves, and pulls a separate React-context family the project doesn't otherwise use.
- **CSS-only `<details>`-based accordion**: rejected at the spec stage (user picked tabs over accordion).

---

## Decision 2: URL state — `window.location.hash` vs Next.js router

**Decision**: Use `window.location.hash` directly. Read on mount via a client-only `useEffect`, write via `history.replaceState` (no full navigation). Listen for `hashchange` to handle external changes (e.g., back/forward, manual paste).

**Rationale**:
- Hash fragments are by spec **never sent to the server** and never trigger SSR. App Router `useSearchParams`/`useParams`/`router.replace` would add ceremony for no benefit.
- `history.replaceState` keeps the back/forward stack clean — clicking a tab doesn't create a Back-button entry. Matches user expectation: tabs are within-page UI, not navigation.
- `hashchange` event is universally supported and lets us recover gracefully if the user types `/stats#weaknesses` directly into the address bar of an already-open page.
- No conflict with Next.js: App Router does not own hash state; using `window.location.hash` is the documented escape hatch.

**Alternatives considered**:
- **`useRouter().replace('/stats#performance')`**: works but slower (RSC roundtrip in some configs), and creates additional `history` entries. Rejected.
- **Search params (`?tab=performance`)**: would survive page reload identically to hash, but search params ARE sent to the server and DO trigger Next.js to consider them part of the route. For static-export friendliness (Constitution Principle V), hash is cleaner.
- **Pathnames (`/stats/performance`)**: would require new route segments and a `loading.tsx`-shaped UX mismatch. Rejected — too much architectural ripple for what is genuinely in-page state.

**Implementation notes**:
- On first render, before paint, read `location.hash` synchronously. If recognised, use it; else read localStorage; else default to Overview. Set the active-tab state in initial state to avoid a flash of the wrong tab (SC-005).
- Because Next.js renders `app/stats/page.tsx` as a client component (`"use client"`), `window` is available in `useState` initialiser via a small `typeof window !== 'undefined'` guard.

---

## Decision 3: Mobile auto-scroll — `Element.scrollIntoView` options

**Decision**: When activating a tab, call `tabElement.scrollIntoView({ inline: 'center', block: 'nearest', behavior })` where `behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`. Skip the call when the tab is already fully visible (cheap check via `getBoundingClientRect` against the tablist container's rect) to avoid spurious horizontal jumps on desktop where tabs always fit.

**Rationale**:
- `inline: 'center'` keeps the active tab visually balanced rather than glued to the leading edge — better for users scanning back and forth.
- `block: 'nearest'` prevents the *page* from vertical-scrolling when the tab list happens to be off-screen (e.g., user pressed End to jump to the bottom of a long tab panel and then activated a different tab via keyboard).
- The reduced-motion check is required by FR-015 and is satisfied by querying `matchMedia` once per tab change (the listener is short-lived). Setting `behavior: 'auto'` skips the smooth-scroll animation entirely.
- All three target browsers (Chrome, Safari ≥ 16, Firefox) support these options. No polyfill needed.

**Alternatives considered**:
- **`scrollLeft = tab.offsetLeft - container.clientWidth/2 + tab.clientWidth/2`** with manual easing: works but reinvents what the platform offers. Rejected — KISS.
- **Always smooth-scroll**: violates FR-015 for reduced-motion users.
- **No auto-scroll** (let the user swipe themselves): violates US-3 acceptance scenario 2 — keyboard navigation to an off-screen tab would activate but leave the tab visually hidden.

---

## Cross-cutting: focus management

This is not a separate decision but a captured invariant for implementation:

- The tablist uses **manual** activation per WAI-ARIA APG: arrow keys move focus *and* selection (i.e., active tab follows focus). Home/End jump to first/last and activate. Tab key moves focus into the active panel. Shift+Tab from within a panel returns focus to the active tab.
- Each tab has `tabIndex={0}` only when active; inactive tabs have `tabIndex={-1}`. This collapses the tablist to a single Tab-stop, matching APG.
- The active panel has `tabIndex={0}` only if it contains no other focusable child by default (so a screen-reader user can land on the panel itself). For our Stats panels, every panel contains at least one focusable element (link, button, or chart with `tabIndex={0}`), so we use `tabIndex={-1}` and rely on the panel's children to be Tab-able.

---

## Cross-cutting: SSR and hydration safety

The `/stats` page is a `"use client"` component today and remains so. The active-tab state is initialised inside the component using a lazy `useState` initialiser:

```ts
const [activeTab, setActiveTab] = useState<TabSlug>(() => resolveInitialTab());
```

Where `resolveInitialTab()` does:
1. If `typeof window === 'undefined'` (SSR pass), return `'overview'`.
2. Else read `window.location.hash`; if recognised, return that slug.
3. Else read `localStorage.getItem('nk-stats-active-tab')`; if recognised, return that slug.
4. Else return `'overview'`.

This initialiser runs once on mount. There is **no hydration mismatch risk** because the page is a `"use client"` component rendered without prerendering of its dynamic content (the existing page already does `if (!progress) return null;` for an analogous reason).

---

## Summary of resolved unknowns

| Topic | Decision |
|---|---|
| Tabs primitive | First-party (`components/StatsTabs.tsx`) — no headless-ui / radix |
| URL state | `window.location.hash` + `history.replaceState` + `hashchange` |
| Mobile auto-scroll | `scrollIntoView({inline:'center',block:'nearest',behavior})` with reduced-motion respected |
| Focus management | WAI-ARIA APG manual-activation pattern; tabIndex roving |
| SSR | Lazy `useState` initialiser, guarded by `typeof window` check |

All decisions align with Constitution Principles I–VII. No `NEEDS CLARIFICATION` markers remain.
