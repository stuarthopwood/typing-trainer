import { describe, it, expect } from "vitest";
import { calculateWpm, calculateAccuracy, buildSessionStats, getCelebrationTier, getErrorHeatmap } from "@/lib/engine";
import type { KeyStroke } from "@/lib/types";

describe("Engine — WPM Calculation", () => {
  it("should return 0 when duration is 0", () => {
    expect(calculateWpm(50, 0)).toBe(0);
  });

  it("should calculate WPM correctly for 1 minute", () => {
    // 250 correct chars / 5 = 50 words in 60000ms = 50 WPM
    expect(calculateWpm(250, 60000)).toBe(50);
  });

  it("should calculate WPM correctly for 30 seconds", () => {
    // 125 chars / 5 = 25 words in 30000ms (0.5 min) = 50 WPM
    expect(calculateWpm(125, 30000)).toBe(50);
  });

  it("should round to nearest integer", () => {
    expect(calculateWpm(100, 60000)).toBe(20);
  });
});

describe("Engine — Accuracy Calculation", () => {
  it("should return 100 when no chars typed", () => {
    expect(calculateAccuracy(0, 0)).toBe(100);
  });

  it("should return 100 for all correct", () => {
    expect(calculateAccuracy(50, 50)).toBe(100);
  });

  it("should calculate percentage correctly", () => {
    expect(calculateAccuracy(90, 100)).toBe(90);
    expect(calculateAccuracy(47, 50)).toBe(94);
  });

  it("should round to nearest integer", () => {
    expect(calculateAccuracy(2, 3)).toBe(67);
  });
});

describe("Engine — Session Stats", () => {
  it("should return zeroed stats for empty keystrokes", () => {
    const stats = buildSessionStats([]);
    expect(stats.wpm).toBe(0);
    expect(stats.accuracy).toBe(100);
    expect(stats.totalChars).toBe(0);
  });

  it("should build correct stats from keystrokes", () => {
    const strokes: KeyStroke[] = [
      { expected: "h", actual: "h", timestamp: 1000, correct: true },
      { expected: "e", actual: "e", timestamp: 1200, correct: true },
      { expected: "l", actual: "k", timestamp: 1400, correct: false },
      { expected: "l", actual: "l", timestamp: 1600, correct: true },
      { expected: "o", actual: "o", timestamp: 1800, correct: true },
    ];
    const stats = buildSessionStats(strokes);
    expect(stats.totalChars).toBe(5);
    expect(stats.correctChars).toBe(4);
    expect(stats.errors).toBe(1);
    expect(stats.accuracy).toBe(80);
    expect(stats.duration).toBe(800);
  });
});

describe("Engine — Celebration Tiers", () => {
  it("should return 'perfect' for 100% accuracy", () => {
    expect(getCelebrationTier(100)).toBe("perfect");
  });

  it("should return 'great' for 95-99%", () => {
    expect(getCelebrationTier(95)).toBe("great");
    expect(getCelebrationTier(99)).toBe("great");
  });

  it("should return 'good' for 90-94%", () => {
    expect(getCelebrationTier(90)).toBe("good");
    expect(getCelebrationTier(94)).toBe("good");
  });

  it("should return 'none' for below 90%", () => {
    expect(getCelebrationTier(89)).toBe("none");
    expect(getCelebrationTier(50)).toBe("none");
  });
});

describe("Engine — Error Heatmap", () => {
  it("should return empty map for no errors", () => {
    const strokes: KeyStroke[] = [
      { expected: "a", actual: "a", timestamp: 0, correct: true },
    ];
    expect(getErrorHeatmap(strokes)).toEqual({});
  });

  it("should count errors per expected character", () => {
    const strokes: KeyStroke[] = [
      { expected: "a", actual: "s", timestamp: 0, correct: false },
      { expected: "a", actual: "d", timestamp: 100, correct: false },
      { expected: "b", actual: "v", timestamp: 200, correct: false },
    ];
    const heatmap = getErrorHeatmap(strokes);
    expect(heatmap["a"]).toBe(2);
    expect(heatmap["b"]).toBe(1);
  });
});
