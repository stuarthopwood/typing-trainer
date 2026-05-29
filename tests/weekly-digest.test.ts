import { describe, it, expect } from "vitest";
import { computeWeeklyDigest, getRecentWeeklyDigests } from "@/lib/weekly-digest";
import type { EnrichedSessionSummary } from "@/lib/types";

function makeSession(daysAgo: number, wpm = 30, accuracy = 90): EnrichedSessionSummary {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return {
    id: `s-${Math.random()}`, timestamp: d.toISOString(), date: d.toISOString().slice(0, 10),
    wpm, accuracy, mode: "drill:home-row", duration: 30000, charsTyped: 100,
    modeDetails: { type: "drill", level: "home-row" },
  };
}

describe("Weekly Digest — computeWeeklyDigest", () => {
  it("should compute digest for current week's sessions", () => {
    // Given sessions from today and yesterday
    const sessions = [makeSession(0, 40, 92), makeSession(1, 35, 88)];

    const digest = computeWeeklyDigest(sessions, 0);

    expect(digest).not.toBeNull();
    expect(digest!.sessions).toBe(2);
    expect(digest!.avgWpm).toBe(38);
    expect(digest!.avgAccuracy).toBe(90);
    expect(digest!.bestWpm).toBe(40);
  });

  it("should return null when no sessions in the week", () => {
    // Given sessions only from 3 weeks ago
    const sessions = [makeSession(21, 30, 90)];
    const digest = computeWeeklyDigest(sessions, 0);
    expect(digest).toBeNull();
  });

  it("should compute improvement compared to previous week", () => {
    // Given sessions this week (avg 40) and last week (avg 30)
    const sessions = [
      makeSession(0, 40, 90),
      makeSession(7, 30, 85), // last week
    ];

    const digest = computeWeeklyDigest(sessions, 0);
    expect(digest!.improvement).toBe(10);
  });

  it("should count unique days practised", () => {
    const sessions = [
      makeSession(0, 40, 90),
      makeSession(0, 35, 88), // same day
      makeSession(1, 30, 85),
    ];

    const digest = computeWeeklyDigest(sessions, 0);
    expect(digest!.daysPractised).toBe(2);
  });

  it("should generate insights for consistent practice", () => {
    // Create sessions on 5 unique days within the current week (Mon-Sun)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const sessions = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() + mondayOffset + i);
      return {
        id: `s-${i}`, timestamp: d.toISOString(), date: d.toISOString().slice(0, 10),
        wpm: 30, accuracy: 90, mode: "drill:home-row", duration: 30000, charsTyped: 100,
        modeDetails: { type: "drill" as const, level: "home-row" },
      };
    });
    const digest = computeWeeklyDigest(sessions, 0);
    expect(digest).not.toBeNull();
    expect(digest!.daysPractised).toBeGreaterThanOrEqual(5);
    expect(digest!.insights.some((i) => i.includes("5+ days"))).toBe(true);
  });
});

describe("Weekly Digest — getRecentWeeklyDigests", () => {
  it("should return digests for recent weeks", () => {
    const sessions = [
      makeSession(0, 40, 90),
      makeSession(7, 35, 88),
      makeSession(14, 30, 85),
    ];

    const digests = getRecentWeeklyDigests(sessions, 4);
    expect(digests.length).toBeGreaterThanOrEqual(2);
  });
});
