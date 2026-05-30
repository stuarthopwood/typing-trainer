/**
 * Tabs state for the /stats page: TabSlug union + parse / read / write / resolve helpers.
 * Pure module — SSR-safe, swallows localStorage failures, no side effects beyond the one
 * `nk-stats-active-tab` localStorage key.
 *
 * Contract: specs/015-stats-tabbed-reorg/contracts/tabs-component.md § 4
 */

export type TabSlug =
  | "overview"
  | "gamification"
  | "performance"
  | "weaknesses"
  | "history";

const TAB_SLUGS: ReadonlyArray<TabSlug> = [
  "overview",
  "gamification",
  "performance",
  "weaknesses",
  "history",
];

const TAB_SLUG_SET: ReadonlySet<string> = new Set<string>(TAB_SLUGS);

export const ACTIVE_TAB_STORAGE_KEY = "nk-stats-active-tab";

const DEFAULT_TAB: TabSlug = "overview";

function isTabSlug(value: unknown): value is TabSlug {
  return typeof value === "string" && TAB_SLUG_SET.has(value);
}

export function parseTabSlug(hash: string | undefined | null): TabSlug | null {
  if (typeof hash !== "string" || hash.length === 0) return null;
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  return isTabSlug(trimmed) ? trimmed : null;
}

export function readPersistedTab(): TabSlug | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    return isTabSlug(value) ? value : null;
  } catch {
    return null;
  }
}

export function writePersistedTab(slug: TabSlug): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, slug);
  } catch {
    // Best-effort: private mode, quota exceeded, etc.
  }
}

export function resolveInitialTab(): TabSlug {
  if (typeof window === "undefined") return DEFAULT_TAB;
  const fromHash = parseTabSlug(window.location.hash);
  if (fromHash) return fromHash;
  const fromStorage = readPersistedTab();
  if (fromStorage) return fromStorage;
  return DEFAULT_TAB;
}
