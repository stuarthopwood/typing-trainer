import { describe, it, expect, beforeEach, vi } from "vitest";
import { getDailyPrompt, getDailyChallengeStreak } from "@/lib/daily-challenge";

describe("Daily Challenge — getDailyPrompt", () => {
  it("should return the same prompt for the same date (deterministic)", () => {
    // Given a fixed date
    const date = "2026-05-22";

    // When fetching the prompt twice
    const first = getDailyPrompt(date);
    const second = getDailyPrompt(date);

    // Then both return the same prompt
    expect(first.prompt).toBe(second.prompt);
    expect(first.date).toBe(date);
  });

  it("should return different prompts for different dates", () => {
    const day1 = getDailyPrompt("2026-05-22");
    const day2 = getDailyPrompt("2026-05-23");
    const day3 = getDailyPrompt("2026-05-24");

    // At least 2 of 3 should differ (statistically near-certain with 50 prompts)
    const unique = new Set([day1.prompt, day2.prompt, day3.prompt]);
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it("should return a non-empty prompt string", () => {
    const result = getDailyPrompt("2026-01-01");
    expect(result.prompt.length).toBeGreaterThan(50);
  });

  it("should default to today's date when none provided", () => {
    const result = getDailyPrompt();
    const today = new Date().toISOString().slice(0, 10);
    expect(result.date).toBe(today);
  });
});

describe("Daily Challenge — getDailyChallengeStreak", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (i: number) => Object.keys(store)[i] ?? null,
      };
    })());
  });

  it("should return 0 when no challenge history", () => {
    expect(getDailyChallengeStreak()).toBe(0);
  });

  it("should count consecutive days from today", () => {
    // Given challenges completed today + yesterday + day before
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dayBefore = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

    const history = [
      { date: today, wpm: 30, accuracy: 90, timeMs: 30000, completedAt: new Date().toISOString(), attempts: 1 },
      { date: yesterday, wpm: 28, accuracy: 88, timeMs: 35000, completedAt: "", attempts: 1 },
      { date: dayBefore, wpm: 25, accuracy: 85, timeMs: 40000, completedAt: "", attempts: 1 },
    ];
    localStorage.setItem("neuralkeys-daily-challenges", JSON.stringify(history));

    expect(getDailyChallengeStreak()).toBe(3);
  });

  it("should break streak on gap day", () => {
    // Given today + 3 days ago (yesterday missed)
    const today = new Date().toISOString().slice(0, 10);
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);

    const history = [
      { date: today, wpm: 30, accuracy: 90, timeMs: 30000, completedAt: "", attempts: 1 },
      { date: threeDaysAgo, wpm: 25, accuracy: 85, timeMs: 40000, completedAt: "", attempts: 1 },
    ];
    localStorage.setItem("neuralkeys-daily-challenges", JSON.stringify(history));

    expect(getDailyChallengeStreak()).toBe(1);
  });
});
