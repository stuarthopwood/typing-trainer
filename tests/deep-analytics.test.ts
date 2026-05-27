import { describe, it, expect } from "vitest";
import { computeBurstSpeed, computeColdStartPenalty, computeRecoveryTime, computeTimeOfDay, computeFingerAccuracy, computeWpmSparkline } from "@/lib/deep-analytics";
import type { KeyStroke, EnrichedSessionSummary } from "@/lib/types";

function makeKeyStroke(timestamp: number, correct = true, expected = "a"): KeyStroke {
  return { expected, actual: correct ? expected : "x", timestamp, correct };
}

function makeSession(hour: number, wpm: number, accuracy = 90): EnrichedSessionSummary {
  const date = new Date(2026, 4, 20, hour, 0, 0);
  return {
    id: `s-${Math.random()}`, timestamp: date.toISOString(), date: date.toISOString().slice(0, 10),
    wpm, accuracy, mode: "drill:home-row", duration: 30000, charsTyped: 100,
    modeDetails: { type: "drill", level: "home-row" },
  };
}

describe("Deep Analytics — computeBurstSpeed", () => {
  it("should compute burst speed from a 5-second rolling window", () => {
    // Given 20 correct keystrokes over 4 seconds (fast), then 10 over 6 seconds (slow)
    const keyStrokes: KeyStroke[] = [];
    for (let i = 0; i < 20; i++) keyStrokes.push(makeKeyStroke(i * 200));
    for (let i = 0; i < 10; i++) keyStrokes.push(makeKeyStroke(4000 + i * 600));

    // When computing burst speed
    const result = computeBurstSpeed(keyStrokes);

    // Then burst is higher than sustained
    expect(result.burst).toBeGreaterThan(result.sustained);
    expect(result.gap).toBeGreaterThan(0);
  });

  it("should return zeros for insufficient keystrokes", () => {
    const result = computeBurstSpeed([makeKeyStroke(0)]);
    expect(result.burst).toBe(0);
    expect(result.sustained).toBe(0);
  });
});

describe("Deep Analytics — computeColdStartPenalty", () => {
  it("should compute penalty between first 10s and remainder", () => {
    // Given slow typing for first 10s, then faster
    const keyStrokes: KeyStroke[] = [];
    // Cold: 10 chars in 10 seconds (slow)
    for (let i = 0; i < 10; i++) keyStrokes.push(makeKeyStroke(i * 1000));
    // Warm: 30 chars in 10 seconds (faster)
    for (let i = 0; i < 30; i++) keyStrokes.push(makeKeyStroke(10000 + i * 333));

    const result = computeColdStartPenalty(keyStrokes);

    // Then warm WPM > cold WPM, penalty is positive
    expect(result.warmWpm).toBeGreaterThan(result.coldWpm);
    expect(result.penalty).toBeGreaterThan(0);
  });

  it("should return zeros for short sessions", () => {
    const result = computeColdStartPenalty([makeKeyStroke(0), makeKeyStroke(100)]);
    expect(result.penalty).toBe(0);
  });
});

describe("Deep Analytics — computeRecoveryTime", () => {
  it("should compute average ms from error to next correct keystroke", () => {
    // Given: correct, error at 1000ms, correct at 1500ms (recovery = 500ms)
    const keyStrokes: KeyStroke[] = [
      makeKeyStroke(0, true),
      makeKeyStroke(1000, false),
      makeKeyStroke(1500, true),
      makeKeyStroke(2000, false),
      makeKeyStroke(2800, true),
    ];

    const result = computeRecoveryTime(keyStrokes);

    // Then average recovery = (500 + 800) / 2 = 650ms
    expect(result.avgRecoveryMs).toBe(650);
    expect(result.count).toBe(2);
  });

  it("should return zero when no errors", () => {
    const keyStrokes = [makeKeyStroke(0), makeKeyStroke(100), makeKeyStroke(200)];
    const result = computeRecoveryTime(keyStrokes);
    expect(result.avgRecoveryMs).toBe(0);
    expect(result.count).toBe(0);
  });
});

describe("Deep Analytics — computeTimeOfDay", () => {
  it("should bucket sessions by time period", () => {
    const sessions = [
      makeSession(8, 30),
      makeSession(9, 35),
      makeSession(14, 40),
      makeSession(20, 25),
    ];

    const result = computeTimeOfDay(sessions);

    // Then morning has 2 sessions, afternoon 1, evening 1
    const morning = result.find((b) => b.label.includes("Morning"));
    expect(morning?.sessions).toBe(2);
    expect(morning?.avgWpm).toBe(33); // (30+35)/2 rounded
  });

  it("should return empty for no sessions", () => {
    expect(computeTimeOfDay([])).toEqual([]);
  });
});

describe("Deep Analytics — computeFingerAccuracy", () => {
  it("should compute accuracy per finger group", () => {
    const keyStrokes: KeyStroke[] = [
      makeKeyStroke(0, true, "a"),  // L Pinky correct
      makeKeyStroke(100, false, "a"), // L Pinky error
      makeKeyStroke(200, true, "j"),  // R Index correct
      makeKeyStroke(300, true, "j"),  // R Index correct
    ];

    const result = computeFingerAccuracy(keyStrokes);

    const lPinky = result.find((f) => f.finger === "L Pinky");
    expect(lPinky?.accuracy).toBe(50);
    expect(lPinky?.total).toBe(2);

    const rIndex = result.find((f) => f.finger === "R Index");
    expect(rIndex?.accuracy).toBe(100);
  });
});

describe("Deep Analytics — computeWpmSparkline", () => {
  it("should return last N WPMs in chronological order", () => {
    const sessions = [
      makeSession(10, 40), // most recent (index 0)
      makeSession(9, 35),
      makeSession(8, 30),
    ];

    const result = computeWpmSparkline(sessions, 3);

    // Reversed to chronological: oldest first
    expect(result).toEqual([30, 35, 40]);
  });

  it("should limit to count parameter", () => {
    const sessions = Array.from({ length: 50 }, (_, i) => makeSession(10, 20 + i));
    const result = computeWpmSparkline(sessions, 30);
    expect(result).toHaveLength(30);
  });
});
