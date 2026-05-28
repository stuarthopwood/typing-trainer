import { describe, it, expect } from "vitest";
import { buildCalendarData, computeStreaks, generateCalendarGrid } from "@/lib/calendar";
import type { EnrichedSessionSummary } from "@/lib/types";

function makeSession(date: string, wpm = 30, accuracy = 90): EnrichedSessionSummary {
  return {
    id: `session-${date}-${Math.random()}`,
    timestamp: `${date}T12:00:00.000Z`,
    date,
    wpm,
    accuracy,
    mode: "drill:home-row",
    duration: 30000,
    charsTyped: 100,
    modeDetails: { type: "drill", level: "home-row" },
  };
}

describe("Calendar — buildCalendarData", () => {
  it("should aggregate sessions by date", () => {
    // Given sessions on two dates
    const sessions = [
      makeSession("2026-05-20", 30, 90),
      makeSession("2026-05-20", 40, 95),
      makeSession("2026-05-21", 50, 85),
    ];

    // When building calendar data
    const data = buildCalendarData(sessions);

    // Then each date has correct counts and averages
    expect(data.get("2026-05-20")?.sessionCount).toBe(2);
    expect(data.get("2026-05-20")?.avgWpm).toBe(35);
    expect(data.get("2026-05-21")?.sessionCount).toBe(1);
    expect(data.get("2026-05-21")?.avgWpm).toBe(50);
  });

  it("should handle empty sessions array", () => {
    const data = buildCalendarData([]);
    expect(data.size).toBe(0);
  });
});

describe("Calendar — computeStreaks", () => {
  it("should compute current streak from consecutive days ending today", () => {
    // Given sessions on 3 consecutive days ending today
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const sessions = [
      makeSession(today),
      makeSession(yesterday),
      makeSession(dayBefore),
    ];

    // When computing streaks
    const streaks = computeStreaks(sessions);

    // Then current streak is 3
    expect(streaks.current).toBe(3);
  });

  it("should compute current streak from consecutive days ending yesterday", () => {
    // Given sessions on 2 consecutive days ending yesterday (user hasn't typed today yet)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const sessions = [makeSession(yesterday), makeSession(dayBefore)];
    const streaks = computeStreaks(sessions);

    // Then current streak is 2 (grace period for today)
    expect(streaks.current).toBe(2);
  });

  it("should reset current streak when gap exists", () => {
    // Given sessions with a gap (3 days ago, then today — yesterday missed)
    const today = new Date().toISOString().slice(0, 10);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

    const sessions = [makeSession(today), makeSession(threeDaysAgo)];
    const streaks = computeStreaks(sessions);

    // Then current streak is 1 (only today)
    expect(streaks.current).toBe(1);
  });

  it("should compute longest streak across all history", () => {
    // Given a 5-day streak in history + 1-day current
    const today = new Date().toISOString().slice(0, 10);
    const sessions = [makeSession(today)];

    // Add a 5-day streak from 2 weeks ago
    for (let i = 10; i <= 14; i++) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      sessions.push(makeSession(d));
    }

    const streaks = computeStreaks(sessions);

    // Then longest is 5, current is 1
    expect(streaks.longest).toBe(5);
    expect(streaks.current).toBe(1);
  });

  it("should return zeros for empty sessions", () => {
    const streaks = computeStreaks([]);
    expect(streaks.current).toBe(0);
    expect(streaks.longest).toBe(0);
  });
});

describe("Calendar — generateCalendarGrid", () => {
  it("should generate 52 weeks of dates", () => {
    const weeks = generateCalendarGrid();
    expect(weeks.length).toBe(52);
  });

  it("should have 7 days per week", () => {
    const weeks = generateCalendarGrid();
    for (const week of weeks) {
      expect(week.length).toBe(7);
    }
  });

  it("should include today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    const weeks = generateCalendarGrid();
    const allDates = weeks.flat();
    expect(allDates).toContain(today);
  });
});
