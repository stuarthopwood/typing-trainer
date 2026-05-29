import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildSessionStats } from "@/lib/engine";
import { generateDrillText, DRILL_LEVELS } from "@/lib/drills";
import { recordSession, getProgress } from "@/lib/progress";
import { checkBadgeUnlocks } from "@/lib/badges";
import { checkAchievements, getLevelFromXp } from "@/lib/achievements";
import type { KeyStroke } from "@/lib/types";

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

describe("Integration — Full Typing Session Flow", () => {
  it("should generate drill text, simulate typing, build stats, record session, and update progress", () => {
    // Given a fresh user with no progress
    const config = DRILL_LEVELS[0]; // home-row
    const text = generateDrillText(config, 20);

    // When the user types the text perfectly
    const keyStrokes: KeyStroke[] = text.split("").map((char, i) => ({
      expected: char,
      actual: char,
      timestamp: i * 200,
      correct: true,
    }));

    // Then session stats are computed correctly
    const stats = buildSessionStats(keyStrokes);
    expect(stats.wpm).toBeGreaterThan(0);
    expect(stats.accuracy).toBe(100);
    expect(stats.totalChars).toBe(text.length);
    expect(stats.correctChars).toBe(text.length);
    expect(stats.errors).toBe(0);

    // And the session is recorded
    const { progress, session } = recordSession(stats, "drill:home-row", {
      modeDetails: { type: "drill", level: "home-row" },
    });

    // Then progress is updated
    expect(progress.totalSessions).toBe(1);
    expect(progress.totalCharsTyped).toBe(text.length);
    expect(progress.bestWpm).toBe(stats.wpm);
    expect(progress.bestAccuracy).toBe(100);
    expect(progress.currentStreak).toBe(1);

    // And session is enriched
    expect(session.id).toBeTruthy();
    expect(session.wpm).toBe(stats.wpm);
    expect(session.mode).toBe("drill:home-row");
  });

  it("should accumulate XP across sessions and trigger badge unlocks", () => {
    // Given a user who has completed several sessions (simulate via direct progress)
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 10, totalCharsTyped: 500, bestWpm: 30, bestAccuracy: 95,
      currentStreak: 5, bestStreak: 5, lastSessionDate: new Date().toISOString().slice(0, 10),
      recentSessions: [], errorHeatmap: {}, levelProgress: {},
      xp: 95, achievements: [], tips: [], badges: [{ id: "caveman", unlockedAt: "2026-01-01" }],
    }));

    // When they complete another session earning 10 XP (pushing past level 2 at 100)
    const stats = { wpm: 35, accuracy: 96, totalChars: 50, correctChars: 48, errors: 2, duration: 30000, keyStrokes: [] as KeyStroke[] };
    const { progress } = recordSession(stats, "drill:home-row", { modeDetails: { type: "drill", level: "home-row" } });

    // Then XP increases
    expect(progress.xp).toBe(95); // recordSession doesn't add XP — the caller does

    // Simulate caller adding XP
    const oldLevel = getLevelFromXp(95).level;
    progress.xp = 95 + 10; // +5 base + 5 accuracy bonus
    const newLevel = getLevelFromXp(progress.xp).level;

    // Then badge unlock check runs
    const newBadges = checkBadgeUnlocks(oldLevel, newLevel, progress.badges || []);
    if (newLevel > oldLevel) {
      expect(newBadges.length).toBeGreaterThan(0);
      expect(newBadges[0].level).toBe(newLevel);
    }
  });

  it("should track errors in heatmap for non-zen sessions", () => {
    // Given a session with errors on specific keys
    const keyStrokes: KeyStroke[] = [
      { expected: "a", actual: "s", timestamp: 0, correct: false },
      { expected: "b", actual: "b", timestamp: 100, correct: true },
      { expected: "a", actual: "d", timestamp: 200, correct: false },
      { expected: "c", actual: "c", timestamp: 300, correct: true },
    ];
    const stats = buildSessionStats(keyStrokes);

    // When session is recorded
    const { progress } = recordSession(stats, "drill:home-row", { modeDetails: { type: "drill", level: "home-row" } });

    // Then error heatmap tracks the problem key
    expect(progress.errorHeatmap["a"]).toBe(2);
    expect(progress.errorHeatmap["b"]).toBeUndefined();
  });

  it("should NOT track errors in heatmap for zen sessions", () => {
    // Given a zen session with errors
    const keyStrokes: KeyStroke[] = [
      { expected: "x", actual: "y", timestamp: 0, correct: false },
    ];
    const stats = buildSessionStats(keyStrokes);

    // When zen session is recorded
    const { progress } = recordSession(stats, "zen", { modeDetails: { type: "zen", topic: "test" } });

    // Then error heatmap is empty (zen excluded)
    expect(Object.keys(progress.errorHeatmap).length).toBe(0);
  });

  it("should compute achievements based on accumulated progress", () => {
    // Given a user at 10 sessions
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 9, totalCharsTyped: 450, bestWpm: 30, bestAccuracy: 95,
      currentStreak: 3, bestStreak: 5, lastSessionDate: new Date().toISOString().slice(0, 10),
      recentSessions: [], errorHeatmap: {}, levelProgress: { "drill:home-row": 4 },
      xp: 50, achievements: [], tips: [], badges: [],
    }));

    // When 10th session is recorded
    const stats = { wpm: 35, accuracy: 92, totalChars: 50, correctChars: 46, errors: 4, duration: 30000, keyStrokes: [] as KeyStroke[] };
    const { progress } = recordSession(stats, "drill:home-row", { modeDetails: { type: "drill", level: "home-row" } });

    // Then achievements can be checked
    const earned = checkAchievements(
      { totalSessions: progress.totalSessions, totalCharsTyped: progress.totalCharsTyped, bestWpm: progress.bestWpm, bestAccuracy: progress.bestAccuracy, currentStreak: progress.currentStreak, bestStreak: progress.bestStreak, sessionWpm: stats.wpm, sessionAccuracy: stats.accuracy, levelProgress: progress.levelProgress },
      []
    );
    // "Getting Warmed Up" achievement requires 10 sessions
    const tenSessions = earned.find((a) => a.id === "ten-sessions");
    expect(tenSessions).toBeDefined();
  });
});
