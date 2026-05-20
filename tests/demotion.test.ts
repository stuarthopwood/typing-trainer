import { describe, it, expect, beforeEach, vi } from "vitest";
import { processDrillDemotion, getHighestUnlockedDrillLevel, type ProgressData } from "@/lib/progress";

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

function makeProgress(levelProgress: Record<string, number> = {}): ProgressData {
  return {
    totalSessions: 0,
    totalCharsTyped: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: "",
    recentSessions: [],
    errorHeatmap: {},
    levelProgress,
    xp: 0,
    achievements: [],
    tips: [],
    drillLowAccuracyStreak: {},
  };
}

describe("processDrillDemotion", () => {
  it("does not demote on a single sub-70% session", () => {
    const progress = makeProgress({ "drill:home-row": 5 });
    const result = processDrillDemotion(progress, 65, "top-row");
    expect(result.demoted).toBe(false);
    expect(progress.drillLowAccuracyStreak?.["top-row"]).toBe(1);
    expect(progress.levelProgress["drill:home-row"]).toBe(5);
  });

  it("demotes on two consecutive sub-70% sessions and re-locks the level", () => {
    const progress = makeProgress({ "drill:home-row": 5, "drill:top-row": 3 });
    processDrillDemotion(progress, 65, "top-row");
    const result = processDrillDemotion(progress, 50, "top-row");
    expect(result.demoted).toBe(true);
    expect(result.fromLevel).toBe("top-row");
    expect(result.toLevel).toBe("home-row");
    expect(progress.levelProgress["drill:home-row"]).toBe(0);
    expect(progress.drillLowAccuracyStreak?.["top-row"]).toBe(0);
  });

  it("resets the streak on a passing session", () => {
    const progress = makeProgress({ "drill:home-row": 5 });
    processDrillDemotion(progress, 65, "top-row");
    expect(progress.drillLowAccuracyStreak?.["top-row"]).toBe(1);
    const result = processDrillDemotion(progress, 90, "top-row");
    expect(result.demoted).toBe(false);
    expect(progress.drillLowAccuracyStreak?.["top-row"]).toBe(0);
  });

  it("never demotes from home-row", () => {
    const progress = makeProgress();
    processDrillDemotion(progress, 50, "home-row");
    const result = processDrillDemotion(progress, 50, "home-row");
    expect(result.demoted).toBe(false);
    expect(progress.drillLowAccuracyStreak?.["home-row"]).toBe(0);
  });

  it("treats accuracy at exactly 70 as passing", () => {
    const progress = makeProgress({ "drill:home-row": 5 });
    const result = processDrillDemotion(progress, 70, "top-row");
    expect(result.demoted).toBe(false);
    expect(progress.drillLowAccuracyStreak?.["top-row"]).toBe(0);
  });

  it("tracks streaks per-level independently", () => {
    const progress = makeProgress({ "drill:home-row": 5, "drill:top-row": 5 });
    processDrillDemotion(progress, 60, "top-row");
    processDrillDemotion(progress, 60, "bottom-row");
    expect(progress.drillLowAccuracyStreak?.["top-row"]).toBe(1);
    expect(progress.drillLowAccuracyStreak?.["bottom-row"]).toBe(1);
  });
});

describe("getHighestUnlockedDrillLevel", () => {
  it("returns home-row when nothing is unlocked", () => {
    expect(getHighestUnlockedDrillLevel()).toBe("home-row");
  });

  it("returns the highest level once intermediate levels are unlocked", () => {
    const stored: ProgressData = makeProgress({ "drill:home-row": 5, "drill:top-row": 5 });
    localStorage.setItem("typing-trainer-progress", JSON.stringify(stored));
    expect(getHighestUnlockedDrillLevel()).toBe("bottom-row");
  });
});
