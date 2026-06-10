import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StatsPage from "@/app/stats/page";
import { loadAllSessions } from "@/lib/sessions";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// migrateAllSessions / loadAllSessions hit Vercel Blob in production.
// In tests, return empty quickly so we land on the post-migration render.
vi.mock("@/lib/sessions", () => ({
  migrateAllSessions: vi.fn().mockResolvedValue(undefined),
  loadAllSessions: vi.fn().mockResolvedValue([]),
  deleteSession: vi.fn().mockResolvedValue(true),
}));

// Pre-populate the progress blob so getProgress() returns deterministic data.
function makeStubStorage(seed: Record<string, string> = {}) {
  let store: Record<string, string> = { ...seed };
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

const PROGRESS_FIXTURE = {
  totalSessions: 2,
  totalCharsTyped: 200,
  bestWpm: 60,
  bestAccuracy: 95,
  currentStreak: 1,
  bestStreak: 5,
  lastSessionDate: "2026-05-29",
  recentSessions: [
    {
      id: "session-a",
      timestamp: "2026-05-29T10:00:00Z",
      date: "2026-05-29",
      wpm: 60,
      accuracy: 95,
      mode: "drill",
      duration: 30000,
      charsTyped: 200,
      modeDetails: { type: "drill", level: "home-row" },
    },
    {
      id: "session-b",
      timestamp: "2026-05-28T10:00:00Z",
      date: "2026-05-28",
      wpm: 55,
      accuracy: 92,
      mode: "drill",
      duration: 30000,
      charsTyped: 180,
      modeDetails: { type: "drill", level: "home-row" },
    },
  ],
  errorHeatmap: {},
  levelProgress: {},
  xp: 50,
  achievements: [],
  tips: [],
  badges: [],
};

const ORIGINAL_HASH = window.location.hash;

beforeEach(() => {
  vi.stubGlobal(
    "localStorage",
    makeStubStorage({
      "typing-trainer-progress": JSON.stringify(PROGRESS_FIXTURE),
      "typing-trainer-pin": "1234",
    }),
  );
  window.location.hash = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.location.hash = ORIGINAL_HASH;
});

// ─── US1 #3: Header + undo toasts persist across tab switches ───────────────

describe("StatsPage — header + toast persistence (US1 #3, FR-017, FR-018)", () => {
  it("should keep the header visible regardless of active tab", async () => {
    // Given the StatsPage renders with seeded progress
    render(<StatsPage />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /overview/i })).toBeInTheDocument(),
    );

    // When the user switches between tabs
    const headerTitle = () => screen.getByRole("heading", { name: /^stats$/i });
    const backLink = () => screen.getByRole("link", { name: /back to typing/i });
    const logoutBtn = () => screen.getByRole("button", { name: /logout/i });

    expect(headerTitle()).toBeInTheDocument();
    expect(backLink()).toBeInTheDocument();
    expect(logoutBtn()).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /weaknesses/i }));

    // Then the header (back arrow + Stats title + logout) is still in the DOM
    expect(headerTitle()).toBeInTheDocument();
    expect(backLink()).toBeInTheDocument();
    expect(logoutBtn()).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /history/i }));
    expect(headerTitle()).toBeInTheDocument();
    expect(backLink()).toBeInTheDocument();
    expect(logoutBtn()).toBeInTheDocument();
  });

  it("should keep an active deletion-undo toast visible across a tab switch", async () => {
    // Given the StatsPage renders with seeded progress (Overview shows the recent sessions)
    render(<StatsPage />);
    await waitFor(() =>
      expect(screen.getByText(/recent sessions/i)).toBeInTheDocument(),
    );

    // When the user clicks the trash button on a session row
    const deleteBtn = await screen.findByRole("button", {
      name: /delete session from 2026-05-29/i,
    });
    fireEvent.click(deleteBtn);

    // Then the undo toast appears
    const toast = await screen.findByText(
      /deleted session — 2026-05-29, 60 WPM/i,
    );
    expect(toast).toBeInTheDocument();

    // And when the user switches tabs while the toast is still showing
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));

    // Then the undo toast remains visible (toast lives in the page shell, outside the tabs)
    expect(
      screen.getByText(/deleted session — 2026-05-29, 60 WPM/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^undo$/i }),
    ).toBeInTheDocument();
  });
});

// ─── History charts must not flash in then disappear ────────────────────────

describe("StatsPage — history charts survive the async load (regression)", () => {
  it("should keep history charts mounted when the remote load returns fewer sessions than local", async () => {
    // Given two legacy local sessions WITHOUT ids (saved before the `id` field
    // existed) ...
    const legacy = JSON.parse(JSON.stringify(PROGRESS_FIXTURE));
    delete legacy.recentSessions[0].id;
    delete legacy.recentSessions[1].id;
    vi.stubGlobal(
      "localStorage",
      makeStubStorage({
        "typing-trainer-progress": JSON.stringify(legacy),
        "typing-trainer-pin": "1234",
      }),
    );
    // ... and a remote history that returns just ONE (different) session.
    // The old merge dropped the id-less locals, leaving a single session —
    // below the 2-session chart threshold — so the charts flashed in (from the
    // pre-load localStorage render) then vanished once the load resolved.
    vi.mocked(loadAllSessions).mockResolvedValueOnce([
      {
        id: "remote-x",
        timestamp: "2026-05-27T10:00:00Z",
        date: "2026-05-27",
        wpm: 50,
        accuracy: 90,
        mode: "drill",
        duration: 30000,
        charsTyped: 150,
        modeDetails: { type: "drill", level: "home-row" },
      },
    ] as never);

    render(<StatsPage />);
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: /history/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));

    // Then the charts "flash in" from the 2 pre-load local sessions ...
    expect(await screen.findByText(/sessions per week/i)).toBeInTheDocument();
    expect(screen.getByText(/mode breakdown/i)).toBeInTheDocument();

    // ... the async remote load runs ...
    await waitFor(() => expect(loadAllSessions).toHaveBeenCalled());

    // ... and the charts STAY mounted (1 remote + 2 retained id-less locals = 3,
    // above the 2-session threshold). The old code shrank to 1 and unmounted.
    await waitFor(
      () =>
        expect(screen.getByText(/sessions per week/i)).toBeInTheDocument(),
      { timeout: 200 },
    );
    expect(screen.getByText(/mode breakdown/i)).toBeInTheDocument();
  });

  it("should still show charts when the merged count lands exactly on the threshold", async () => {
    // Given ONE id-less legacy local session ...
    const legacy = JSON.parse(JSON.stringify(PROGRESS_FIXTURE));
    legacy.recentSessions = [legacy.recentSessions[0]];
    delete legacy.recentSessions[0].id;
    vi.stubGlobal(
      "localStorage",
      makeStubStorage({
        "typing-trainer-progress": JSON.stringify(legacy),
        "typing-trainer-pin": "1234",
      }),
    );
    // ... plus ONE remote session → 2 total, exactly the chart threshold.
    vi.mocked(loadAllSessions).mockResolvedValueOnce([
      {
        id: "remote-x",
        timestamp: "2026-05-27T10:00:00Z",
        date: "2026-05-27",
        wpm: 50,
        accuracy: 90,
        mode: "drill",
        duration: 30000,
        charsTyped: 150,
        modeDetails: { type: "drill", level: "home-row" },
      },
    ] as never);

    render(<StatsPage />);
    await waitFor(() => expect(loadAllSessions).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));

    // Then charts render at exactly 2 sessions (the `>= 2` boundary).
    expect(await screen.findByText(/sessions per week/i)).toBeInTheDocument();
  });

  it("should fall back to local sessions when the remote load fails", async () => {
    // Given a remote load that rejects, with 2 valid local sessions present
    vi.mocked(loadAllSessions).mockRejectedValueOnce(new Error("blob down"));

    render(<StatsPage />);
    await waitFor(() => expect(loadAllSessions).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("tab", { name: /history/i }));

    // Then the charts still render from the localStorage fallback (catch branch).
    expect(await screen.findByText(/sessions per week/i)).toBeInTheDocument();
    expect(screen.getByText(/mode breakdown/i)).toBeInTheDocument();
  });
});
