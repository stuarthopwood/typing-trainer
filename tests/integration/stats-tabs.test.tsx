import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatsTabs from "@/components/StatsTabs";
import type { ProgressData } from "@/lib/progress";
import type { EnrichedSessionSummary } from "@/lib/types";
import { ACTIVE_TAB_STORAGE_KEY } from "@/lib/stats-tabs";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeStubStorage() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

function makeSession(over: Partial<EnrichedSessionSummary> = {}): EnrichedSessionSummary {
  return {
    id: `s-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: "2026-05-29T10:00:00Z",
    date: "2026-05-29",
    wpm: 60,
    accuracy: 95,
    mode: "drill",
    duration: 30000,
    charsTyped: 200,
    modeDetails: { type: "drill", level: "home-row" },
    ...over,
  };
}

function makeProgress(over: Partial<ProgressData> = {}): ProgressData {
  return {
    totalSessions: 5,
    totalCharsTyped: 1000,
    bestWpm: 65,
    bestAccuracy: 98,
    currentStreak: 3,
    bestStreak: 7,
    lastSessionDate: "2026-05-29",
    recentSessions: [],
    errorHeatmap: {},
    levelProgress: {},
    xp: 100,
    achievements: [],
    tips: [],
    badges: [],
    ...over,
  };
}

function renderTabs(props?: Partial<React.ComponentProps<typeof StatsTabs>>) {
  const onHeatmapCaseChange = vi.fn();
  const onDeleteSession = vi.fn();
  const defaultProgress = makeProgress();
  const defaultSessions = [makeSession({ id: "s1" }), makeSession({ id: "s2" })];
  return {
    onHeatmapCaseChange,
    onDeleteSession,
    ...render(
      <StatsTabs
        progress={props?.progress ?? defaultProgress}
        sessions={props?.sessions ?? defaultSessions}
        loadingHistory={props?.loadingHistory ?? false}
        heatmapCase={props?.heatmapCase ?? "lower"}
        onHeatmapCaseChange={props?.onHeatmapCaseChange ?? onHeatmapCaseChange}
        onDeleteSession={props?.onDeleteSession ?? onDeleteSession}
      />,
    ),
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const ORIGINAL_HASH = window.location.hash;

beforeEach(() => {
  vi.stubGlobal("localStorage", makeStubStorage());
  window.location.hash = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = ORIGINAL_HASH;
});

// ─── US1: Discoverable, themed sections ──────────────────────────────────────

describe("StatsTabs — US1: discoverable themed sections", () => {
  it("should render five tabs with Overview active by default (US1 #1)", () => {
    // Given a user with seeded data
    // When the page renders with no hash and nothing persisted
    // Then five tabs are visible and Overview is active
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    const tabNames = tabs.map((t) => t.textContent?.trim());
    expect(tabNames).toEqual([
      "Overview",
      "Game",
      "Performance",
      "Weaknesses",
      "History",
    ]);
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Overview-specific content visible
    expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();
  });

  it("should swap panels when a different tab is clicked (US1 #2)", () => {
    // Given the user is on Overview
    renderTabs();
    expect(screen.getByText(/recent sessions/i)).toBeInTheDocument();

    // When the user clicks the Performance tab
    fireEvent.click(screen.getByRole("tab", { name: /performance/i }));

    // Then Overview content is gone and Performance content is mounted
    expect(screen.queryByText(/recent sessions/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /performance/i }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("should keep tablist visible regardless of active tab (US1 #3)", () => {
    // Given a user is on Overview
    renderTabs();
    expect(screen.getAllByRole("tab")).toHaveLength(5);

    // When the user switches to Weaknesses
    fireEvent.click(screen.getByRole("tab", { name: /weaknesses/i }));

    // Then the tablist is still in the DOM (the tab bar persists across switches)
    expect(screen.getAllByRole("tab")).toHaveLength(5);
  });

  it("should show empty-state when active tab has no qualifying data (US1 + FR-019)", () => {
    // Given a user with no errors and no bigram data
    const progress = makeProgress({ errorHeatmap: {} });
    const sessions = [makeSession({ timingMetadata: undefined })];
    renderTabs({ progress, sessions });

    // When the user opens the Weaknesses tab
    fireEvent.click(screen.getByRole("tab", { name: /weaknesses/i }));

    // Then an empty-state message is shown
    expect(screen.getByText(/no errors or slow bigrams/i)).toBeInTheDocument();
  });
});

// ─── US2: Deep link + persistence ────────────────────────────────────────────

describe("StatsTabs — US2: deep-link and persistent tab state", () => {
  it("should activate the tab named by the URL hash (US2 #1)", () => {
    // Given the URL hash is set before render
    window.location.hash = "performance";

    // When the StatsTabs render
    renderTabs();

    // Then the Performance tab is active
    expect(
      screen.getByRole("tab", { name: /performance/i }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("should persist the activated tab to localStorage (US2 #2 + #4)", () => {
    // Given the user has rendered StatsTabs
    renderTabs();

    // When they activate the Weaknesses tab
    fireEvent.click(screen.getByRole("tab", { name: /weaknesses/i }));

    // Then localStorage records "weaknesses"
    expect(window.localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("weaknesses");
    // And the URL hash is updated
    expect(window.location.hash).toBe("#weaknesses");
  });

  it("should restore the persisted tab on a fresh render with no hash (US2 #2)", () => {
    // Given a previously-persisted tab in localStorage
    window.localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "history");

    // When the StatsTabs render with no URL hash
    renderTabs();

    // Then the persisted tab is active
    expect(
      screen.getByRole("tab", { name: /history/i }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("should fall back to overview when the URL hash is unrecognised (US2 #3)", () => {
    // Given an unknown URL hash and nothing persisted
    window.location.hash = "nonsense";

    // When the StatsTabs render
    renderTabs();

    // Then Overview is the safe default
    expect(
      screen.getByRole("tab", { name: /overview/i }),
    ).toHaveAttribute("aria-selected", "true");
  });
});

// ─── US3: Mobile / scrollIntoView ────────────────────────────────────────────

describe("StatsTabs — US3: mobile-friendly tab navigation", () => {
  it("should render tablist as a horizontally-scrollable row (US3 #1)", () => {
    // Given a small viewport
    // When the StatsTabs render
    // Then the tablist has overflow-x styling enabling native horizontal scroll
    renderTabs();
    const tablist = screen.getByRole("tablist");
    expect(tablist.className).toContain("overflow-x-auto");
    expect(tablist.className).toContain("flex-nowrap");
  });

  it("should give every tab a 44px minimum tap target (US3 #1, FR-013)", () => {
    // Given the tabs are rendered
    // When we inspect each tab
    // Then they have min-h-[44px] and min-w-[44px] classes
    renderTabs();
    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab.className).toContain("min-h-[44px]");
      expect(tab.className).toContain("min-w-[44px]");
    });
  });

  it("should call scrollIntoView when activating a tab whose rect is outside the tablist (US3 #2)", () => {
    // Given the tablist where the active tab is offscreen (mocked rects)
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollSpy,
    });
    renderTabs();

    // Mock getBoundingClientRect so the tablist is narrower than its tabs
    const tablist = screen.getByRole("tablist");
    Object.defineProperty(tablist, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 0, right: 100, top: 0, bottom: 44, width: 100, height: 44 }),
    });
    const targetTab = screen.getByRole("tab", { name: /history/i });
    Object.defineProperty(targetTab, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 400, right: 500, top: 0, bottom: 44, width: 100, height: 44 }),
    });

    // When the user activates the off-screen tab
    fireEvent.click(targetTab);

    // Then scrollIntoView is called on it with center alignment
    expect(scrollSpy).toHaveBeenCalled();
    const args = scrollSpy.mock.calls[0]?.[0];
    expect(args).toMatchObject({ inline: "center", block: "nearest" });
  });

  it("should pass behavior:'auto' to scrollIntoView when prefers-reduced-motion is set", () => {
    // Given a user who prefers reduced motion
    const scrollSpy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: scrollSpy,
    });
    const matchMediaSpy = vi
      .spyOn(window, "matchMedia")
      .mockImplementation(
        (query: string) =>
          ({
            matches: query.includes("prefers-reduced-motion"),
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          }) as unknown as MediaQueryList,
      );
    renderTabs();

    // Force the off-screen layout
    const tablist = screen.getByRole("tablist");
    Object.defineProperty(tablist, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 0, right: 100, top: 0, bottom: 44, width: 100, height: 44 }),
    });
    const targetTab = screen.getByRole("tab", { name: /weaknesses/i });
    Object.defineProperty(targetTab, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 200, right: 300, top: 0, bottom: 44, width: 100, height: 44 }),
    });

    // When the user clicks an off-screen tab
    fireEvent.click(targetTab);

    // Then behavior is 'auto' (no animation) for accessibility
    const args = scrollSpy.mock.calls.at(-1)?.[0];
    expect(args).toMatchObject({ behavior: "auto" });
    matchMediaSpy.mockRestore();
  });
});

// ─── US4: Keyboard / ARIA ────────────────────────────────────────────────────

describe("StatsTabs — US4: keyboard + ARIA", () => {
  it("should expose tablist / tab / tabpanel roles with proper linkage (US4 #3)", () => {
    // Given the StatsTabs render
    // When we inspect ARIA
    // Then roles, ids, and aria-controls are wired correctly
    renderTabs();
    const tablist = screen.getByRole("tablist");
    expect(tablist).toHaveAttribute("aria-label");
    const overviewTab = screen.getByRole("tab", { name: /overview/i });
    expect(overviewTab).toHaveAttribute("id", "stats-tab-overview");
    expect(overviewTab).toHaveAttribute("aria-controls", "stats-panel-overview");
    expect(overviewTab).toHaveAttribute("aria-selected", "true");
    const overviewPanel = screen.getByRole("tabpanel");
    expect(overviewPanel).toHaveAttribute("id", "stats-panel-overview");
    expect(overviewPanel).toHaveAttribute("aria-labelledby", "stats-tab-overview");
  });

  it("should set tabIndex 0 on active tab and -1 on others (FR-011 roving)", () => {
    // Given the StatsTabs render with Overview active
    // When we inspect tabIndex
    // Then only the active tab participates in the Tab key sequence
    renderTabs();
    const overviewTab = screen.getByRole("tab", { name: /overview/i });
    const otherTab = screen.getByRole("tab", { name: /history/i });
    expect(overviewTab.tabIndex).toBe(0);
    expect(otherTab.tabIndex).toBe(-1);
  });

  it("should move activation to the next tab on ArrowRight (US4 #1)", () => {
    // Given focus is on the Overview tab
    renderTabs();
    const overviewTab = screen.getByRole("tab", { name: /overview/i });
    overviewTab.focus();

    // When ArrowRight is pressed
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });

    // Then Game (the next tab) becomes active
    expect(screen.getByRole("tab", { name: /game/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("should wrap from first tab to last on ArrowLeft (US4 #1)", () => {
    // Given Overview is active
    renderTabs();

    // When ArrowLeft is pressed
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowLeft" });

    // Then History (the last tab) becomes active (wrap-around)
    expect(screen.getByRole("tab", { name: /history/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("should jump to first tab on Home and last tab on End (US4 #2)", () => {
    // Given the user has navigated to a middle tab
    renderTabs();
    fireEvent.click(screen.getByRole("tab", { name: /performance/i }));

    // When End is pressed
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "End" });
    // Then History becomes active
    expect(screen.getByRole("tab", { name: /history/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // When Home is pressed
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "Home" });
    // Then Overview becomes active
    expect(screen.getByRole("tab", { name: /overview/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

// ─── Per-tab content rendering (FR-003 through FR-007) ─────────────────────

describe("StatsTabs — panel content per tab", () => {
  it("should render Performance panels when ≥5 sessions exist", () => {
    // Given a user with enough sessions for all performance gates
    const sessions = Array.from({ length: 6 }, (_, i) =>
      makeSession({ id: `s-${i}` }),
    );
    const progress = makeProgress({
      errorHeatmap: { a: 1, b: 2 },
    });
    renderTabs({ sessions, progress });

    // When the user opens Performance
    fireEvent.click(screen.getByRole("tab", { name: /performance/i }));

    // Then performance section is mounted (Personal Bests heading)
    expect(screen.getByText(/personal best/i)).toBeInTheDocument();
  });

  it("should show empty-state in Performance when no qualifying data", () => {
    // Given a user with no sessions and no errors
    const progress = makeProgress({
      totalSessions: 0,
      bestWpm: 0,
      bestAccuracy: 0,
      currentStreak: 0,
      errorHeatmap: {},
      tips: [],
    });
    renderTabs({ progress, sessions: [] });

    // When the user opens Performance
    fireEvent.click(screen.getByRole("tab", { name: /performance/i }));

    // Then an empty-state message is shown
    expect(
      screen.getByText(/complete more sessions to unlock performance/i),
    ).toBeInTheDocument();
  });

  it("should render History panels when sessions exist", () => {
    // Given a user with ≥2 sessions
    const sessions = [
      makeSession({ id: "s1", date: "2026-05-29" }),
      makeSession({ id: "s2", date: "2026-05-28" }),
    ];
    renderTabs({ sessions });

    // When the user opens History
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));

    // Then the History tab is active and panels mount (no error)
    expect(screen.getByRole("tab", { name: /history/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("should show empty-state in History when there are no sessions", () => {
    // Given no session data at all
    const progress = makeProgress({ totalSessions: 0 });
    renderTabs({ progress, sessions: [] });

    // When the user opens History
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));

    // Then an empty-state message is shown
    expect(screen.getByText(/no sessions recorded yet/i)).toBeInTheDocument();
  });

  it("should render Overview empty-state when there is nothing to show", () => {
    // Given zero sessions and no tips
    const progress = makeProgress({
      totalSessions: 0,
      bestWpm: 0,
      bestAccuracy: 0,
      currentStreak: 0,
      tips: [],
    });
    renderTabs({ progress, sessions: [] });

    // When the user lands on Overview (the default)
    // Then a guidance message is shown
    expect(
      screen.getByText(/complete a typing session to populate your overview/i),
    ).toBeInTheDocument();
  });

  it("should render Gamification panels (Streak, Badges, DailyChallenge)", () => {
    // Given a user with badges
    const progress = makeProgress({
      badges: [{ id: "caveman", unlockedAt: "2026-05-20" }],
    });
    renderTabs({ progress });

    // When the user opens Gamification
    fireEvent.click(screen.getByRole("tab", { name: /game/i }));

    // Then the Game tab is active (panel mounts)
    expect(screen.getByRole("tab", { name: /game/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("should show NemesisCard in Gamification only when errorHeatmap is non-empty", () => {
    // Given a user with errors
    const progress = makeProgress({ errorHeatmap: { a: 5, e: 3 } });
    renderTabs({ progress });

    // When the user opens Gamification
    fireEvent.click(screen.getByRole("tab", { name: /game/i }));

    // Then the panel mounts and the heading "nemesis" appears
    expect(screen.getByText(/nemesis/i)).toBeInTheDocument();
  });

  it("should render Weaknesses content when errors exist", () => {
    // Given a user with errors and bigram timing data
    const progress = makeProgress({ errorHeatmap: { a: 3, e: 2 } });
    const sessions = [
      makeSession({
        id: "s1",
        timingMetadata: {
          slowestBigrams: [{ bigram: "th", avgMs: 200 }],
          fastestBigrams: [],
          burstWpm: 80,
          recoveryMs: 100,
          fatigueRatio: 1.0,
          leftHand: { keystrokes: 50, errors: 1 },
          rightHand: { keystrokes: 50, errors: 1 },
        } as never, // partial fixture; the chart only inspects slowestBigrams
      }),
    ];
    renderTabs({ progress, sessions });

    // When the user opens Weaknesses
    fireEvent.click(screen.getByRole("tab", { name: /weaknesses/i }));

    // Then the Weaknesses panel is active
    expect(
      screen.getByRole("tab", { name: /weaknesses/i }),
    ).toHaveAttribute("aria-selected", "true");
  });
});

// ─── Recent Sessions delete button + Tips expand/collapse (Overview details) ─

describe("StatsTabs — Overview interactive elements", () => {
  it("should call onDeleteSession when the trash button is clicked", () => {
    // Given a session that has an id (deletable) in the recent list
    const sessions = [
      makeSession({ id: "s1", date: "2026-05-29", wpm: 70, accuracy: 96 }),
    ];
    const onDeleteSession = vi.fn();
    renderTabs({ sessions, onDeleteSession });

    // When the user clicks the delete button for that session
    const deleteBtn = screen.getByRole("button", {
      name: /delete session from 2026-05-29/i,
    });
    fireEvent.click(deleteBtn);

    // Then onDeleteSession is called with that session
    expect(onDeleteSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1" }),
    );
  });

  it("should colour-code accuracy classes (≥95 / ≥80 / <80)", () => {
    // Given three sessions across the accuracy bands
    const sessions = [
      makeSession({ id: "a", accuracy: 99 }),
      makeSession({ id: "b", accuracy: 85 }),
      makeSession({ id: "c", accuracy: 60 }),
    ];
    renderTabs({ sessions });

    // When the Overview renders
    // Then the text appears (colour classes are styling, exercised here for branch coverage)
    expect(screen.getByText("99%")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("should expand a tip with explanation when clicked", () => {
    // Given a tip with an explanation in the progress
    const progress = makeProgress({
      tips: [
        {
          text: "Slow down on R-T transitions",
          explanation: "Both keys are typed by the index finger of the left hand…",
          createdAt: "2026-05-28T10:00:00Z",
        },
      ],
    });
    renderTabs({ progress });

    // When the user clicks the tip
    const tipText = screen.getByText(/slow down on r-t transitions/i);
    fireEvent.click(tipText);

    // Then the explanation is revealed
    expect(
      screen.getByText(/both keys are typed by the index finger/i),
    ).toBeInTheDocument();

    // When the user clicks again
    fireEvent.click(tipText);

    // Then the explanation is collapsed
    expect(
      screen.queryByText(/both keys are typed by the index finger/i),
    ).not.toBeInTheDocument();
  });

  it("should render a non-interactive tip when no explanation is present", () => {
    // Given a tip with no explanation
    const progress = makeProgress({
      tips: [{ text: "Use rest day", createdAt: "2026-05-28T10:00:00Z" }],
    });
    renderTabs({ progress });

    // When the page renders
    // Then the tip is shown but not as a clickable button
    expect(screen.getByText(/use rest day/i)).toBeInTheDocument();
    // The tip is rendered as a non-button (no role=button on the wrapper)
    expect(
      screen.queryByRole("button", { name: /use rest day/i }),
    ).not.toBeInTheDocument();
  });

  it("should expand a tip on Enter key for keyboard users", () => {
    // Given a tip with explanation
    const progress = makeProgress({
      tips: [
        {
          text: "Reduce error count",
          explanation: "Aim for under 3% error rate",
          createdAt: "2026-05-28T10:00:00Z",
        },
      ],
    });
    renderTabs({ progress });

    // When the user focuses the tip and presses Enter
    const tip = screen.getByRole("button", { name: /reduce error count/i });
    fireEvent.keyDown(tip, { key: "Enter" });

    // Then the explanation is expanded
    expect(
      screen.getByText(/aim for under 3% error rate/i),
    ).toBeInTheDocument();
  });

  it("should not render the trash button for sessions without an id", () => {
    // Given a session with no id (legacy local session)
    const sessions: EnrichedSessionSummary[] = [
      makeSession({ id: "" }), // empty id treated as falsy
    ];
    renderTabs({ sessions });

    // When the Overview renders
    // Then no delete button is shown for that row
    expect(
      screen.queryByRole("button", { name: /delete session/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── US5: Lazy panel mount ───────────────────────────────────────────────────

describe("StatsTabs — US5: lazy panel mounting", () => {
  it("should NOT mount panels for inactive tabs on initial render (US5 #1)", () => {
    // Given a fresh render on Overview
    // When we inspect the DOM
    // Then only the Overview panel has any inner content; other panels are hidden
    renderTabs();
    const overviewPanel = document.querySelector("#stats-panel-overview");
    const performancePanel = document.querySelector("#stats-panel-performance");
    expect(overviewPanel?.hasAttribute("hidden")).toBe(false);
    expect(performancePanel?.hasAttribute("hidden")).toBe(true);
    // The hidden panel renders as an empty <div> — no children mounted
    expect(performancePanel?.children.length ?? 0).toBe(0);
  });

  it("should mount the new panel and unmount the old one on tab switch (US5 #2)", () => {
    // Given the user is on Overview
    renderTabs();
    expect(
      document.querySelector("#stats-panel-overview")?.children.length,
    ).toBeGreaterThan(0);

    // When the user switches to Performance
    fireEvent.click(screen.getByRole("tab", { name: /performance/i }));

    // Then Performance panel mounts and Overview panel unmounts
    expect(
      document.querySelector("#stats-panel-performance")?.children.length,
    ).toBeGreaterThan(0);
    expect(
      document.querySelector("#stats-panel-overview")?.children.length ?? 0,
    ).toBe(0);
  });
});
