import { describe, it, expect } from "vitest";
import { computePersonalBests, computeLongestPerfectStreak, checkNewPersonalBest, computeLifetimeStats, computeFunEquivalences, emptyPersonalBests } from "@/lib/personal-bests";
import type { EnrichedSessionSummary, KeyStroke } from "@/lib/types";

function makeSession(overrides: Partial<EnrichedSessionSummary> = {}): EnrichedSessionSummary {
  return {
    id: `s-${Math.random()}`, timestamp: "2026-05-20T12:00:00.000Z", date: "2026-05-20",
    wpm: 30, accuracy: 90, mode: "drill:home-row", duration: 30000, charsTyped: 100,
    modeDetails: { type: "drill", level: "home-row" },
    ...overrides,
  };
}

describe("Personal Bests — computePersonalBests", () => {
  it("should find the fastest WPM session", () => {
    const sessions = [makeSession({ wpm: 30 }), makeSession({ wpm: 55 }), makeSession({ wpm: 40 })];
    const pbs = computePersonalBests(sessions);
    expect(pbs.fastestWpm.value).toBe(55);
  });

  it("should find the highest accuracy session", () => {
    const sessions = [makeSession({ accuracy: 85 }), makeSession({ accuracy: 98 }), makeSession({ accuracy: 92 })];
    const pbs = computePersonalBests(sessions);
    expect(pbs.highestAccuracy.value).toBe(98);
  });

  it("should find the most sessions in a single day", () => {
    const sessions = [
      makeSession({ timestamp: "2026-05-20T10:00:00Z" }),
      makeSession({ timestamp: "2026-05-20T11:00:00Z" }),
      makeSession({ timestamp: "2026-05-20T12:00:00Z" }),
      makeSession({ timestamp: "2026-05-21T10:00:00Z" }),
    ];
    const pbs = computePersonalBests(sessions);
    expect(pbs.mostSessionsInDay.value).toBe(3);
    expect(pbs.mostSessionsInDay.date).toBe("2026-05-20");
  });

  it("should return zeros for empty sessions", () => {
    const pbs = computePersonalBests([]);
    expect(pbs.fastestWpm.value).toBe(0);
  });
});

describe("Personal Bests — computeLongestPerfectStreak", () => {
  it("should find the longest run of consecutive correct keystrokes", () => {
    const keyStrokes: KeyStroke[] = [
      { expected: "a", actual: "a", timestamp: 0, correct: true },
      { expected: "b", actual: "b", timestamp: 100, correct: true },
      { expected: "c", actual: "c", timestamp: 200, correct: true },
      { expected: "d", actual: "x", timestamp: 300, correct: false },
      { expected: "e", actual: "e", timestamp: 400, correct: true },
      { expected: "f", actual: "f", timestamp: 500, correct: true },
    ];
    expect(computeLongestPerfectStreak(keyStrokes)).toBe(3);
  });

  it("should return 0 for all errors", () => {
    const keyStrokes: KeyStroke[] = [
      { expected: "a", actual: "x", timestamp: 0, correct: false },
      { expected: "b", actual: "y", timestamp: 100, correct: false },
    ];
    expect(computeLongestPerfectStreak(keyStrokes)).toBe(0);
  });

  it("should handle all correct as full length", () => {
    const keyStrokes: KeyStroke[] = Array.from({ length: 50 }, (_, i) => ({
      expected: "a", actual: "a", timestamp: i * 100, correct: true,
    }));
    expect(computeLongestPerfectStreak(keyStrokes)).toBe(50);
  });
});

describe("Personal Bests — checkNewPersonalBest", () => {
  it("should detect when WPM record is broken", () => {
    const pbs = emptyPersonalBests();
    pbs.fastestWpm = { value: 40, date: "2026-05-19", sessionId: "old" };
    pbs.highestAccuracy = { value: 99, date: "2026-05-19", sessionId: "old" };
    pbs.longestSession = { value: 120000, date: "2026-05-19", sessionId: "old" };

    const session = makeSession({ wpm: 55, accuracy: 90, duration: 30000 });
    const broken = checkNewPersonalBest(pbs, session);

    expect(broken).toHaveLength(1);
    expect(broken[0].field).toBe("Fastest WPM");
    expect(broken[0].oldValue).toBe(40);
    expect(broken[0].newValue).toBe(55);
  });

  it("should not report when no records broken", () => {
    const pbs = emptyPersonalBests();
    pbs.fastestWpm = { value: 60, date: "2026-05-19", sessionId: "old" };
    pbs.highestAccuracy = { value: 99, date: "2026-05-19", sessionId: "old" };
    pbs.longestSession = { value: 120000, date: "2026-05-19", sessionId: "old" };

    const session = makeSession({ wpm: 30, accuracy: 80, duration: 30000 });
    const broken = checkNewPersonalBest(pbs, session);

    expect(broken).toHaveLength(0);
  });
});

describe("Personal Bests — computeLifetimeStats", () => {
  it("should aggregate lifetime counters from sessions", () => {
    const sessions = [
      makeSession({ charsTyped: 100, duration: 30000, accuracy: 90, timestamp: "2026-05-20T10:00:00Z" }),
      makeSession({ charsTyped: 200, duration: 60000, accuracy: 95, timestamp: "2026-05-21T10:00:00Z" }),
    ];
    const stats = computeLifetimeStats(sessions);

    expect(stats.totalChars).toBe(300);
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalTimeMs).toBe(90000);
    expect(stats.daysPractised).toBe(2);
    expect(stats.totalErrors).toBeGreaterThan(0);
  });
});

describe("Personal Bests — computeFunEquivalences", () => {
  it("should compute fun equivalences from lifetime stats", () => {
    const stats = { totalChars: 160000, totalSessions: 50, totalTimeMs: 2640000, totalErrors: 3000, daysPractised: 30 };
    const eq = computeFunEquivalences(stats);

    expect(eq.length).toBeGreaterThanOrEqual(3);
    expect(eq.find((e) => e.label === "novels typed")?.value).toBe("2.0");
  });

  it("should return empty for zero stats", () => {
    const eq = computeFunEquivalences({ totalChars: 0, totalSessions: 0, totalTimeMs: 0, totalErrors: 0, daysPractised: 0 });
    expect(eq).toEqual([]);
  });
});
