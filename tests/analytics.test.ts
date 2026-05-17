import { describe, it, expect } from "vitest";
import {
  computeBigramTimings,
  computeConsistencyScore,
  computeFatigueRatio,
  computeSessionTimingMetadata,
  computeRollingAverage,
  computeImprovementRate,
  findPersonalRecords,
  bucketByTimeOfDay,
  updatePracticeTargets,
} from "@/lib/analytics";
import type { KeyStroke, EnrichedSessionSummary } from "@/lib/types";

function makeStroke(expected: string, actual: string, timestamp: number, correct: boolean, extra?: Partial<KeyStroke>): KeyStroke {
  return { expected, actual, timestamp, correct, ...extra };
}

function makeSession(date: string, wpm: number, accuracy: number, overrides?: Partial<EnrichedSessionSummary>): EnrichedSessionSummary {
  return {
    id: `${date}-${wpm}`,
    timestamp: `${date}T12:00:00Z`,
    date,
    wpm,
    accuracy,
    mode: "drill:home-row",
    duration: 30000,
    charsTyped: 100,
    modeDetails: { type: "drill", level: "home-row" },
    ...overrides,
  };
}

describe("Analytics — computeBigramTimings", () => {
  it("should return empty for fewer than 2 strokes", () => {
    const strokes = [makeStroke("a", "a", 0, true)];
    expect(computeBigramTimings(strokes)).toEqual([]);
  });

  it("should compute bigram delays using timestamps", () => {
    const strokes = [
      makeStroke("t", "t", 0, true),
      makeStroke("h", "h", 150, true),
      makeStroke("t", "t", 300, true),
      makeStroke("h", "h", 450, true),
    ];
    const bigrams = computeBigramTimings(strokes);
    const th = bigrams.find((b) => b.bigram === "th");
    expect(th).toBeDefined();
    expect(th!.occurrences).toBe(2);
    expect(th!.avgDelay).toBe(150);
  });

  it("should use keyUpTimestamp for flight time when available", () => {
    const strokes = [
      makeStroke("a", "a", 0, true, { keyUpTimestamp: 50 }),
      makeStroke("b", "b", 100, true, { keyUpTimestamp: 150 }),
      makeStroke("a", "a", 200, true, { keyUpTimestamp: 250 }),
      makeStroke("b", "b", 300, true, { keyUpTimestamp: 350 }),
    ];
    const bigrams = computeBigramTimings(strokes);
    const ab = bigrams.find((b) => b.bigram === "ab");
    expect(ab).toBeDefined();
    expect(ab!.avgDelay).toBe(50); // (100-50 + 300-250) / 2 = 50ms flight time
  });

  it("should skip error strokes", () => {
    const strokes = [
      makeStroke("a", "a", 0, true),
      makeStroke("b", "x", 100, false),
      makeStroke("c", "c", 200, true),
    ];
    const bigrams = computeBigramTimings(strokes);
    expect(bigrams.find((b) => b.bigram === "ab")).toBeUndefined();
  });

  it("should sort by avgDelay descending and cap at 20", () => {
    const strokes: KeyStroke[] = [];
    for (let i = 0; i < 50; i++) {
      strokes.push(makeStroke(String.fromCharCode(97 + (i % 26)), String.fromCharCode(97 + (i % 26)), i * 100, true));
    }
    const bigrams = computeBigramTimings(strokes);
    expect(bigrams.length).toBeLessThanOrEqual(20);
    for (let i = 1; i < bigrams.length; i++) {
      expect(bigrams[i - 1].avgDelay).toBeGreaterThanOrEqual(bigrams[i].avgDelay);
    }
  });
});

describe("Analytics — computeConsistencyScore", () => {
  it("should return 0 for fewer than 2 strokes", () => {
    expect(computeConsistencyScore([makeStroke("a", "a", 0, true)])).toBe(0);
  });

  it("should return 0 for perfectly consistent timing", () => {
    const strokes = [
      makeStroke("a", "a", 0, true),
      makeStroke("b", "b", 100, true),
      makeStroke("c", "c", 200, true),
      makeStroke("d", "d", 300, true),
    ];
    expect(computeConsistencyScore(strokes)).toBe(0);
  });

  it("should return higher score for inconsistent timing", () => {
    const consistent = [
      makeStroke("a", "a", 0, true),
      makeStroke("b", "b", 100, true),
      makeStroke("c", "c", 200, true),
    ];
    const inconsistent = [
      makeStroke("a", "a", 0, true),
      makeStroke("b", "b", 50, true),
      makeStroke("c", "c", 500, true),
    ];
    expect(computeConsistencyScore(inconsistent)).toBeGreaterThan(computeConsistencyScore(consistent));
  });
});

describe("Analytics — computeFatigueRatio", () => {
  it("should return 1.0 for fewer than 8 strokes", () => {
    const strokes = Array.from({ length: 7 }, (_, i) => makeStroke("a", "a", i * 100, true));
    expect(computeFatigueRatio(strokes)).toBe(1.0);
  });

  it("should return ~1.0 for uniform timing", () => {
    const strokes = Array.from({ length: 20 }, (_, i) => makeStroke("a", "a", i * 100, true));
    expect(computeFatigueRatio(strokes)).toBeCloseTo(1.0, 1);
  });

  it("should return > 1.0 when last quarter is slower", () => {
    const strokes: KeyStroke[] = [];
    for (let i = 0; i < 20; i++) {
      const delay = i < 15 ? 100 : 300;
      strokes.push(makeStroke("a", "a", (strokes[i - 1]?.timestamp ?? 0) + delay, true));
    }
    expect(computeFatigueRatio(strokes)).toBeGreaterThan(1.0);
  });
});

describe("Analytics — computeSessionTimingMetadata", () => {
  it("should compute all fields", () => {
    const strokes = [
      makeStroke("a", "a", 0, true, { keyUpTimestamp: 40, holdDuration: 40, interKeyDelay: 0 }),
      makeStroke("b", "b", 100, true, { keyUpTimestamp: 130, holdDuration: 30, interKeyDelay: 60 }),
      makeStroke("c", "c", 200, true, { keyUpTimestamp: 225, holdDuration: 25, interKeyDelay: 70 }),
      makeStroke("d", "d", 300, true, { keyUpTimestamp: 340, holdDuration: 40, interKeyDelay: 75 }),
      makeStroke("e", "e", 400, true, { keyUpTimestamp: 420, holdDuration: 20, interKeyDelay: 60 }),
      makeStroke("f", "f", 500, true, { keyUpTimestamp: 530, holdDuration: 30, interKeyDelay: 80 }),
      makeStroke("g", "g", 600, true, { keyUpTimestamp: 640, holdDuration: 40, interKeyDelay: 70 }),
      makeStroke("h", "h", 700, true, { keyUpTimestamp: 720, holdDuration: 20, interKeyDelay: 60 }),
    ];
    const meta = computeSessionTimingMetadata(strokes);
    expect(meta.avgHoldDuration).toBeGreaterThan(0);
    expect(meta.avgInterKeyDelay).toBeGreaterThan(0);
    expect(meta.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(meta.fatigueRatio).toBeGreaterThan(0);
    expect(meta.shortPresses).toBe(3); // 25ms, 20ms, and 20ms — all < 30
  });

  it("should count short presses correctly", () => {
    const strokes = [
      makeStroke("a", "a", 0, true, { holdDuration: 10 }),
      makeStroke("b", "b", 100, true, { holdDuration: 50 }),
      makeStroke("c", "c", 200, true, { holdDuration: 15 }),
      makeStroke("d", "d", 300, true, { holdDuration: 29 }),
    ];
    const meta = computeSessionTimingMetadata(strokes);
    expect(meta.shortPresses).toBe(3);
  });
});

describe("Analytics — computeRollingAverage", () => {
  it("should return empty for no sessions", () => {
    expect(computeRollingAverage([], 7, "wpm")).toEqual([]);
  });

  it("should compute rolling averages", () => {
    const sessions = [
      makeSession("2025-01-01", 30, 90),
      makeSession("2025-01-02", 40, 92),
      makeSession("2025-01-03", 50, 95),
    ];
    const rolling = computeRollingAverage(sessions, 7, "wpm");
    expect(rolling).toHaveLength(3);
    expect(rolling[2].value).toBe(40); // avg of 30, 40, 50
  });
});

describe("Analytics — computeImprovementRate", () => {
  it("should return empty for fewer than 2 sessions", () => {
    expect(computeImprovementRate([makeSession("2025-01-01", 30, 90)])).toEqual([]);
  });

  it("should compute weekly WPM gain", () => {
    const sessions = [
      makeSession("2025-01-06", 30, 90),
      makeSession("2025-01-07", 35, 92),
      makeSession("2025-01-13", 45, 95),
      makeSession("2025-01-14", 50, 95),
    ];
    const rates = computeImprovementRate(sessions);
    expect(rates.length).toBeGreaterThan(0);
    expect(rates[0].wpmGain).toBeGreaterThan(0);
  });
});

describe("Analytics — findPersonalRecords", () => {
  it("should find WPM and accuracy records", () => {
    const sessions = [
      makeSession("2025-01-01", 30, 85),
      makeSession("2025-01-02", 35, 90),
      makeSession("2025-01-03", 33, 95),
    ];
    const records = findPersonalRecords(sessions);
    expect(records.length).toBeGreaterThanOrEqual(3);
    expect(records.some((r) => r.type === "wpm" && r.value === 35)).toBe(true);
    expect(records.some((r) => r.type === "accuracy" && r.value === 95)).toBe(true);
  });
});

describe("Analytics — bucketByTimeOfDay", () => {
  it("should bucket sessions by hour", () => {
    const sessions = [
      makeSession("2025-01-01", 30, 90, { timestamp: "2025-01-01T09:00:00Z" }),
      makeSession("2025-01-01", 40, 92, { timestamp: "2025-01-01T09:30:00Z" }),
      makeSession("2025-01-01", 50, 95, { timestamp: "2025-01-01T14:00:00Z" }),
    ];
    const buckets = bucketByTimeOfDay(sessions);
    const hour9 = buckets.find((b) => b.hour === 9);
    expect(hour9).toBeDefined();
    expect(hour9!.count).toBe(2);
    expect(hour9!.avgWpm).toBe(35);
  });
});

describe("Analytics — updatePracticeTargets", () => {
  it("should extract chars from error heatmap", () => {
    const heatmap = { t: 10, h: 8, e: 6, a: 2 };
    const targets = updatePracticeTargets(heatmap, undefined, []);
    expect(targets.chars).toContain("t");
    expect(targets.chars).toContain("h");
    expect(targets.chars).toContain("e");
  });

  it("should extract chars from error patterns", () => {
    const patterns = [
      { type: "repeated-char" as const, description: "", chars: ["x", "z"], frequency: 5 },
      { type: "shallow-activation" as const, description: "", chars: ["q", "w"], frequency: 3 },
    ];
    const targets = updatePracticeTargets({}, undefined, patterns);
    expect(targets.chars).toContain("x");
    expect(targets.chars).toContain("z");
    expect(targets.chars).toContain("q");
    expect(targets.chars).toContain("w");
  });

  it("should extract bigrams from timing metadata", () => {
    const timing = {
      avgHoldDuration: 50,
      avgInterKeyDelay: 100,
      slowestBigrams: [
        { bigram: "th", avgDelay: 250, occurrences: 5 },
        { bigram: "er", avgDelay: 150, occurrences: 3 },
      ],
      shortPresses: 0,
      consistencyScore: 50,
      fatigueRatio: 1.0,
    };
    const targets = updatePracticeTargets({}, timing, []);
    expect(targets.bigrams).toContain("th");
    expect(targets.bigrams).not.toContain("er"); // 150 < 200 (2x avg of 100)
  });

  it("should cap chars at 15 and bigrams at 10", () => {
    const heatmap: Record<string, number> = {};
    for (let i = 0; i < 26; i++) {
      heatmap[String.fromCharCode(97 + i)] = 26 - i;
    }
    const targets = updatePracticeTargets(heatmap, undefined, []);
    expect(targets.chars.length).toBeLessThanOrEqual(15);
  });

  it("should include timestamp", () => {
    const targets = updatePracticeTargets({ a: 5 }, undefined, []);
    expect(targets.updatedAt).toBeTruthy();
    expect(new Date(targets.updatedAt).getTime()).toBeGreaterThan(0);
  });
});
