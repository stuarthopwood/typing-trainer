import { describe, it, expect, beforeEach, vi } from "vitest";
import { getProgress, recordSession } from "@/lib/progress";
import type { SessionStats } from "@/lib/types";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("localStorage", localStorageMock);
});

describe("Progress — Default State", () => {
  it("should return zeroed progress when nothing stored", () => {
    const p = getProgress();
    expect(p.totalSessions).toBe(0);
    expect(p.bestWpm).toBe(0);
    expect(p.currentStreak).toBe(0);
    expect(p.recentSessions).toEqual([]);
    expect(p.errorHeatmap).toEqual({});
  });
});

describe("Progress — Recording Sessions", () => {
  const mockStats: SessionStats = {
    wpm: 45,
    accuracy: 92,
    totalChars: 100,
    correctChars: 92,
    errors: 8,
    duration: 60000,
    keyStrokes: [
      { expected: "a", actual: "s", timestamp: 0, correct: false },
      { expected: "b", actual: "b", timestamp: 100, correct: true },
    ],
  };

  it("should increment total sessions", () => {
    const { progress: p } = recordSession(mockStats, "passage");
    expect(p.totalSessions).toBe(1);
  });

  it("should track best WPM", () => {
    const { progress: p } = recordSession(mockStats, "passage");
    expect(p.bestWpm).toBe(45);
  });

  it("should update error heatmap", () => {
    const { progress: p } = recordSession(mockStats, "passage");
    expect(p.errorHeatmap["a"]).toBe(1);
  });

  it("should keep recent sessions capped at 50", () => {
    const stats: SessionStats = { ...mockStats };
    for (let i = 0; i < 55; i++) {
      recordSession(stats, "drill:home-row");
    }
    const p = getProgress();
    expect(p.recentSessions.length).toBeLessThanOrEqual(50);
  });
});
