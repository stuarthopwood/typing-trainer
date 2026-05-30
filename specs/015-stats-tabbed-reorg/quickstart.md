# Quickstart: Working with the Stats Page Tabs

**Feature**: `015-stats-tabbed-reorg` · **Date**: 2026-05-29

This is the operator's manual for the tab system once it's implemented. Treat it as the developer-facing complement to the spec — what to do when you want to add, rename, or deep-link a tab.

---

## Files at a glance

| File | What it owns |
|---|---|
| `lib/stats-tabs.ts` | The `TabSlug` union, hash parser, localStorage helpers, initial-tab resolver. |
| `components/StatsTabs.tsx` | The generic `<Tabs>`/`<TabList>`/`<Tab>`/`<TabPanel>` primitive **and** the assembled `<StatsTabs>` for `/stats`. |
| `app/stats/page.tsx` | Loads progress + sessions, then hands them to `<StatsTabs>`. Owns the existing deletion-with-undo and toasts. |

---

## Add a new tab

1. **Pick a slug**: lowercase, kebab-case, ≤ 30 chars, must not collide with an existing one. Example: `'goals'`.

2. **Extend the union** in `lib/stats-tabs.ts`:

   ```ts
   export type TabSlug =
     | 'overview' | 'gamification' | 'performance' | 'weaknesses' | 'history'
     | 'goals'; // ← added
   ```

   This makes the rest of the system fail to compile until you've handled the new case everywhere — which is the point.

3. **Add the descriptor** in `components/StatsTabs.tsx`:

   ```ts
   const TABS: ReadonlyArray<Tab> = [
     // …existing
     { slug: 'goals', label: 'Goals', icon: faBullseye },
   ];
   ```

4. **Add the panel** in the `<StatsTabs>` JSX:

   ```tsx
   <TabPanel tabId="goals">
     <GoalsTab progress={progress} />
   </TabPanel>
   ```

5. **Tests** — add a Given/When/Then to `tests/integration/stats-tabs.test.tsx`:

   ```ts
   it('should activate goals tab when /stats#goals is opened', async () => {
     // Given a fresh visit with #goals
     window.location.hash = 'goals';
     // When the page renders
     render(<StatsPage />);
     // Then the Goals panel is visible
     expect(screen.getByRole('tabpanel', { name: /goals/i })).toBeInTheDocument();
   });
   ```

That's it. The icon is wired automatically; ARIA, keyboard, hash, and storage all work without further code.

---

## Rename or reorder tabs

- **Rename label only** (slug stays the same): change the `label` field in the `TABS` array. URL hashes and stored preferences still work.
- **Rename slug**: this is a breaking change for any user with a deep-link or stored preference. Update the union, the descriptor, and the tests. Storage entries with the old slug will be ignored on read (they fail validation), and the user lands on Overview on next visit. Document the rename in `CHANGELOG.md` under a `### Changed` heading.
- **Reorder**: change the order of entries in the `TABS` array. Tab order and DOM order both follow that array. URL hashes and storage are unaffected (they're keyed by slug, not index).

---

## Deep-link from elsewhere in the app

Anywhere in the app you can link directly to a specific tab:

```tsx
import Link from 'next/link';
<Link href="/stats#weaknesses">Find your weaknesses</Link>
```

The tab opens immediately, no flash of the wrong tab. If you want the user's last-tab to be honoured instead of forcing a tab, link to `/stats` with no hash.

---

## Open a specific tab from code

```ts
window.location.hash = 'performance';
```

This fires `hashchange`; `<StatsTabs>` listens and re-syncs. Use this if you have a "Jump to performance" button outside the tablist (we don't ship one yet, but it's free if needed).

If you want to switch tabs without a hash change (e.g., from a button inside the tab content), call `setActiveTab` — but `<StatsTabs>` doesn't expose `setActiveTab` to children today, so you'd lift the state up. Don't do this casually; it's a sign the feature should grow rather than the contract.

---

## When localStorage is broken

Private mode, quota exceeded, third-party-cookie blocked stores — `writePersistedTab` and `readPersistedTab` swallow all errors. The page degrades to:

- Hash deep-linking still works.
- Without a hash, every visit lands on Overview.

No error toast. No console noise. Designed.

---

## When the user has `prefers-reduced-motion: reduce`

- Tab transitions are instant.
- `scrollIntoView` is called with `behavior: 'auto'` — no smooth scroll on the tab bar.
- No other animation in the tab system.

---

## Adding analytics for tab usage (future)

Out of scope for this feature, but here's where to add it:

- `<StatsTabs>` `setActiveTab` is the single chokepoint for tab activation. Any analytics call belongs there (immediately before or after the localStorage write).
- Avoid double-firing on hashchange (which calls the same path); de-dupe by comparing previous and next slug.

---

## Running the tests

From the repo root:

```bash
# Unit + component tests for tabs:
npm test -- tests/integration/stats-tabs.test.tsx
# Or the whole suite (faster signal):
npm test
# With coverage on touched files:
npm test -- --coverage
```

Coverage on `components/StatsTabs.tsx` and `lib/stats-tabs.ts` MUST stay ≥ 80% per Constitution Principle II.

---

## Manual smoke test

After any change to tabs:

1. Open `/stats` — Overview tab active, big-stat row visible.
2. Click each tab in order. Each panel renders, no others visible.
3. Refresh the page — the last tab you clicked is still active.
4. Paste `/stats#weaknesses` into the address bar — Weaknesses opens immediately.
5. Press Tab into the tablist, Arrow keys to navigate, Home/End to jump.
6. Resize to 320px wide. Tab bar overflows horizontally with smooth scroll. Tap a tab that's off-screen — it scrolls into view.
7. With `prefers-reduced-motion: reduce` set in OS settings — tab switches are instant; no scroll animation.
8. Start a session deletion (trash icon) on a Recent Sessions row. While the undo toast is visible, switch tabs. The toast remains and is operable.

---

## What this feature deliberately does **not** do

- It doesn't reshape any panel or chart.
- It doesn't change persisted data, blobs, or API routes.
- It doesn't add a back-stack history entry per tab click (intentional — tabs are within-page UI).
- It doesn't fire analytics events.
- It doesn't add tab badges (e.g., "3 new" on Gamification). If you want them, that's a follow-up feature with its own spec.
