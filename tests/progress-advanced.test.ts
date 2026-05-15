import { describe, it, expect, beforeEach, vi } from "vitest";
import { getProgress, recordSession, getUnlockedDrillLevels, getUnlockedDifficulties, mergeProgress } from "@/lib/progress";
import type { ProgressData } from "@/lib/progress";
import type { SessionStats } from "@/lib/types";

// Create a localStorage mock since jsdom may not expose it on all platforms
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
});

describe("Progress — mergeProgress", () => {
  const baseProgress: ProgressData = {
    totalSessions: 0,
    totalCharsTyped: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: "",
    recentSessions: [],
    errorHeatmap: {},
    levelProgress: {},
    xp: 0,
    achievements: [],
    tips: [],
  };

  it("should take the max of numeric fields", () => {
    const local: ProgressData = { ...baseProgress, totalSessions: 10, bestWpm: 50, bestAccuracy: 90, totalCharsTyped: 5000, currentStreak: 3, bestStreak: 7, xp: 100 };
    const remote: ProgressData = { ...baseProgress, totalSessions: 8, bestWpm: 60, bestAccuracy: 85, totalCharsTyped: 4000, currentStreak: 5, bestStreak: 5, xp: 150 };

    const merged = mergeProgress(local, remote);
    expect(merged.totalSessions).toBe(10);
    expect(merged.bestWpm).toBe(60);
    expect(merged.bestAccuracy).toBe(90);
    expect(merged.totalCharsTyped).toBe(5000);
    expect(merged.currentStreak).toBe(5);
    expect(merged.bestStreak).toBe(7);
    expect(merged.xp).toBe(150);
  });

  it("should deduplicate recentSessions", () => {
    const session = { date: "2025-01-15", wpm: 45, accuracy: 92, mode: "drill:home-row" };
    const local: ProgressData = { ...baseProgress, recentSessions: [session] };
    const remote: ProgressData = { ...baseProgress, recentSessions: [session] };

    const merged = mergeProgress(local, remote);
    expect(merged.recentSessions).toHaveLength(1);
  });

  it("should keep recentSessions capped at 20", () => {
    const makeSessions = (count: number, prefix: string) =>
      Array.from({ length: count }, (_, i) => ({
        date: `2025-01-${String(i + 1).padStart(2, "0")}`,
        wpm: 40 + i,
        accuracy: 90,
        mode: `${prefix}:${i}`,
      }));

    const local: ProgressData = { ...baseProgress, recentSessions: makeSessions(15, "local") };
    const remote: ProgressData = { ...baseProgress, recentSessions: makeSessions(15, "remote") };

    const merged = mergeProgress(local, remote);
    expect(merged.recentSessions.length).toBeLessThanOrEqual(20);
  });

  it("should merge achievements keeping earliest unlock date", () => {
    const local: ProgressData = {
      ...baseProgress,
      achievements: [
        { id: "first-blood", unlockedAt: "2025-01-10" },
        { id: "speed-30", unlockedAt: "2025-01-12" },
      ],
    };
    const remote: ProgressData = {
      ...baseProgress,
      achievements: [
        { id: "first-blood", unlockedAt: "2025-01-08" },
        { id: "streak-3", unlockedAt: "2025-01-15" },
      ],
    };

    const merged = mergeProgress(local, remote);
    const firstBlood = merged.achievements.find((a) => a.id === "first-blood");
    expect(firstBlood?.unlockedAt).toBe("2025-01-08");
    expect(merged.achievements.find((a) => a.id === "speed-30")).toBeDefined();
    expect(merged.achievements.find((a) => a.id === "streak-3")).toBeDefined();
    expect(merged.achievements).toHaveLength(3);
  });

  it("should merge error heatmaps taking max per key", () => {
    const local: ProgressData = { ...baseProgress, errorHeatmap: { a: 5, b: 3, c: 10 } };
    const remote: ProgressData = { ...baseProgress, errorHeatmap: { a: 8, b: 1, d: 4 } };

    const merged = mergeProgress(local, remote);
    expect(merged.errorHeatmap["a"]).toBe(8);
    expect(merged.errorHeatmap["b"]).toBe(3);
    expect(merged.errorHeatmap["c"]).toBe(10);
    expect(merged.errorHeatmap["d"]).toBe(4);
  });

  it("should merge levelProgress taking max per key", () => {
    const local: ProgressData = { ...baseProgress, levelProgress: { "drill:home-row": 5, "drill:top-row": 2 } };
    const remote: ProgressData = { ...baseProgress, levelProgress: { "drill:home-row": 3, "drill:top-row": 7 } };

    const merged = mergeProgress(local, remote);
    expect(merged.levelProgress["drill:home-row"]).toBe(5);
    expect(merged.levelProgress["drill:top-row"]).toBe(7);
  });

  it("should take the later lastSessionDate", () => {
    const local: ProgressData = { ...baseProgress, lastSessionDate: "2025-01-15" };
    const remote: ProgressData = { ...baseProgress, lastSessionDate: "2025-01-20" };

    const merged = mergeProgress(local, remote);
    expect(merged.lastSessionDate).toBe("2025-01-20");
  });
});

describe("Progress — getUnlockedDrillLevels", () => {
  it("should return only home-row with empty levelProgress", () => {
    const unlocked = getUnlockedDrillLevels();
    expect(unlocked.has("home-row")).toBe(true);
    expect(unlocked.size).toBe(1);
  });

  it("should return home-row + top-row when drill:home-row has 5+ sessions", () => {
    const progress = getProgress();
    progress.levelProgress["drill:home-row"] = 5;
    localStorage.setItem("typing-trainer-progress", JSON.stringify(progress));

    const unlocked = getUnlockedDrillLevels();
    expect(unlocked.has("home-row")).toBe(true);
    expect(unlocked.has("top-row")).toBe(true);
    expect(unlocked.size).toBe(2);
  });

  it("should unlock multiple levels in chain", () => {
    const progress = getProgress();
    progress.levelProgress["drill:home-row"] = 5;
    progress.levelProgress["drill:top-row"] = 5;
    progress.levelProgress["drill:bottom-row"] = 5;
    localStorage.setItem("typing-trainer-progress", JSON.stringify(progress));

    const unlocked = getUnlockedDrillLevels();
    expect(unlocked.has("home-row")).toBe(true);
    expect(unlocked.has("top-row")).toBe(true);
    expect(unlocked.has("bottom-row")).toBe(true);
    expect(unlocked.has("numbers")).toBe(true);
    expect(unlocked.size).toBe(4);
  });

  it("should break chain on first unqualified level", () => {
    const progress = getProgress();
    progress.levelProgress["drill:home-row"] = 5;
    progress.levelProgress["drill:top-row"] = 3; // not enough
    progress.levelProgress["drill:bottom-row"] = 10; // enough but chain broken
    localStorage.setItem("typing-trainer-progress", JSON.stringify(progress));

    const unlocked = getUnlockedDrillLevels();
    expect(unlocked.has("home-row")).toBe(true);
    expect(unlocked.has("top-row")).toBe(true);
    expect(unlocked.has("bottom-row")).toBe(false);
    expect(unlocked.has("numbers")).toBe(false);
    expect(unlocked.size).toBe(2);
  });
});

describe("Progress — getUnlockedDifficulties", () => {
  it("should return only beginner with empty levelProgress", () => {
    const unlocked = getUnlockedDifficulties();
    expect(unlocked.has("beginner")).toBe(true);
    expect(unlocked.size).toBe(1);
  });

  it("should unlock intermediate when passage:beginner has 5+ sessions", () => {
    const progress = getProgress();
    progress.levelProgress["passage:beginner"] = 5;
    localStorage.setItem("typing-trainer-progress", JSON.stringify(progress));

    const unlocked = getUnlockedDifficulties();
    expect(unlocked.has("beginner")).toBe(true);
    expect(unlocked.has("intermediate")).toBe(true);
    expect(unlocked.size).toBe(2);
  });

  it("should break chain on first unqualified difficulty", () => {
    const progress = getProgress();
    progress.levelProgress["passage:beginner"] = 3; // not enough
    progress.levelProgress["passage:intermediate"] = 10;
    localStorage.setItem("typing-trainer-progress", JSON.stringify(progress));

    const unlocked = getUnlockedDifficulties();
    expect(unlocked.has("beginner")).toBe(true);
    expect(unlocked.has("intermediate")).toBe(false);
    expect(unlocked.size).toBe(1);
  });
});

describe("Progress — getProgress edge cases", () => {
  it("should return defaultProgress when localStorage is empty", () => {
    const p = getProgress();
    expect(p.totalSessions).toBe(0);
    expect(p.bestWpm).toBe(0);
    expect(p.recentSessions).toEqual([]);
    expect(p.levelProgress).toEqual({});
    expect(p.xp).toBe(0);
    expect(p.achievements).toEqual([]);
  });

  it("should return defaultProgress when localStorage has invalid JSON", () => {
    localStorage.setItem("typing-trainer-progress", "not valid json{{{");
    const p = getProgress();
    expect(p.totalSessions).toBe(0);
    expect(p.bestWpm).toBe(0);
  });

  it("should return defaultProgress when stored data is not an object", () => {
    localStorage.setItem("typing-trainer-progress", '"just a string"');
    const p = getProgress();
    expect(p.totalSessions).toBe(0);
  });

  it("should return defaultProgress when stored data lacks totalSessions", () => {
    localStorage.setItem("typing-trainer-progress", JSON.stringify({ bestWpm: 50 }));
    const p = getProgress();
    expect(p.totalSessions).toBe(0);
  });

  it("should backfill missing fields (levelProgress, xp, achievements)", () => {
    const partial = { totalSessions: 5, totalCharsTyped: 100, bestWpm: 40, bestAccuracy: 90, currentStreak: 1, bestStreak: 2, lastSessionDate: "2025-01-01", recentSessions: [], errorHeatmap: {} };
    localStorage.setItem("typing-trainer-progress", JSON.stringify(partial));
    const p = getProgress();
    expect(p.totalSessions).toBe(5);
    expect(p.levelProgress).toEqual({});
    expect(p.xp).toBe(0);
    expect(p.achievements).toEqual([]);
  });
});

describe("Progress — recordSession level progression", () => {
  const makeStats = (accuracy: number): SessionStats => ({
    wpm: 40,
    accuracy,
    totalChars: 50,
    correctChars: Math.round(50 * accuracy / 100),
    errors: 50 - Math.round(50 * accuracy / 100),
    duration: 30000,
    keyStrokes: [],
  });

  it("should increment levelProgress when accuracy >= 85", () => {
    const p = recordSession(makeStats(85), "drill:home-row");
    expect(p.levelProgress["drill:home-row"]).toBe(1);
  });

  it("should NOT increment levelProgress when accuracy < 85", () => {
    const p = recordSession(makeStats(84), "drill:home-row");
    expect(p.levelProgress["drill:home-row"]).toBeUndefined();
  });

  it("should increment existing levelProgress", () => {
    recordSession(makeStats(90), "drill:home-row");
    const p = recordSession(makeStats(90), "drill:home-row");
    expect(p.levelProgress["drill:home-row"]).toBe(2);
  });

  it("should cap recentSessions at 20", () => {
    const stats = makeStats(90);
    for (let i = 0; i < 25; i++) {
      recordSession(stats, "drill:home-row");
    }
    const p = getProgress();
    expect(p.recentSessions.length).toBeLessThanOrEqual(20);
  });
});
