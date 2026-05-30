import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StatsPage from "@/app/stats/page";

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
