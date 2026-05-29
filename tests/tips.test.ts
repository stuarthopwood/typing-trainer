import { describe, it, expect } from "vitest";
import { detectErrorPatterns, buildTipPrompt } from "@/lib/tips";
import type { KeyStroke, SessionTimingMetadata } from "@/lib/types";

function makeKS(expected: string, actual: string, timestamp: number, holdDuration?: number): KeyStroke {
  return { expected, actual, timestamp, correct: expected === actual, holdDuration, interKeyDelay: 100 };
}

describe("Tips — detectErrorPatterns", () => {
  it("should return empty array when no errors exist", () => {
    // Given all correct keystrokes
    const keyStrokes: KeyStroke[] = [
      makeKS("a", "a", 0), makeKS("b", "b", 100), makeKS("c", "c", 200),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then no patterns found
    expect(patterns).toEqual([]);
  });

  it("should detect repeated character errors", () => {
    // Given multiple errors on the same key
    const keyStrokes: KeyStroke[] = [
      makeKS("a", "s", 0), makeKS("b", "b", 100), makeKS("a", "d", 200), makeKS("c", "c", 300),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then repeated-char pattern is detected
    const repeated = patterns.find((p) => p.type === "repeated-char");
    expect(repeated).toBeDefined();
    expect(repeated!.chars).toContain("a");
    expect(repeated!.frequency).toBeGreaterThanOrEqual(2);
  });

  it("should detect adjacent key swaps", () => {
    // Given errors where actual is the next expected character (swap)
    const keyStrokes: KeyStroke[] = [
      makeKS("t", "h", 0),   // typed h instead of t
      makeKS("h", "h", 100), // then h was correct (it was swapped from previous)
      makeKS("e", "e", 200),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then adjacent-swap is detected
    const swap = patterns.find((p) => p.type === "adjacent-swap");
    expect(swap).toBeDefined();
  });

  it("should detect speed errors when many errors happen with <100ms gaps", () => {
    // Given errors with very fast inter-key timing
    const keyStrokes: KeyStroke[] = [
      makeKS("a", "a", 0),
      makeKS("b", "x", 50),  // error at 50ms gap
      makeKS("c", "y", 90),  // error at 40ms gap
      makeKS("d", "z", 130), // error at 40ms gap
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then speed-error pattern detected
    const speed = patterns.find((p) => p.type === "speed-error");
    expect(speed).toBeDefined();
    expect(speed!.frequency).toBeGreaterThanOrEqual(2);
  });

  it("should detect capitalization errors", () => {
    // Given errors where case is wrong but letter is correct
    const keyStrokes: KeyStroke[] = [
      makeKS("A", "a", 0), makeKS("B", "b", 100), makeKS("c", "c", 200),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then capitalization pattern detected
    const cap = patterns.find((p) => p.type === "capitalization");
    expect(cap).toBeDefined();
    expect(cap!.chars).toContain("A");
  });

  it("should detect punctuation errors", () => {
    // Given multiple punctuation errors
    const keyStrokes: KeyStroke[] = [
      makeKS(".", "x", 0), makeKS(",", "y", 100), makeKS("a", "a", 200),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then punctuation pattern detected
    const punct = patterns.find((p) => p.type === "punctuation");
    expect(punct).toBeDefined();
  });

  it("should detect shallow activation when hold duration < 30ms", () => {
    // Given errors with very short hold times
    const keyStrokes: KeyStroke[] = [
      makeKS("a", "x", 0, 20), makeKS("b", "y", 100, 15), makeKS("c", "z", 200, 25),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then shallow-activation detected
    const shallow = patterns.find((p) => p.type === "shallow-activation");
    expect(shallow).toBeDefined();
    expect(shallow!.frequency).toBe(3);
  });

  it("should detect slipped finger (adjacent + short hold)", () => {
    // Given errors that hit adjacent keys with short hold
    const keyStrokes: KeyStroke[] = [
      makeKS("s", "d", 0, 20),  // s→d are adjacent, short hold
      makeKS("f", "g", 100, 15), // f→g are adjacent, short hold
      makeKS("a", "a", 200),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then slipped-finger detected
    const slipped = patterns.find((p) => p.type === "slipped-finger");
    expect(slipped).toBeDefined();
  });

  it("should detect slow bigrams from timing metadata", () => {
    // Given timing metadata with slow bigrams
    const keyStrokes: KeyStroke[] = [makeKS("a", "x", 0)];
    const timing: SessionTimingMetadata = {
      avgHoldDuration: 80, avgInterKeyDelay: 120, slowestBigrams: [
        { bigram: "th", avgDelay: 300, occurrences: 5 },
        { bigram: "qu", avgDelay: 280, occurrences: 3 },
      ],
      shortPresses: 0, consistencyScore: 80, fatigueRatio: 1.0,
      leftHand: { errors: 2, total: 20, errorRate: 10, avgDelay: 100 },
      rightHand: { errors: 1, total: 20, errorRate: 5, avgDelay: 90 },
    };

    // When detecting patterns with timing
    const patterns = detectErrorPatterns(keyStrokes, [], timing);

    // Then slow-bigrams detected
    const slow = patterns.find((p) => p.type === "slow-bigrams");
    expect(slow).toBeDefined();
    expect(slow!.chars).toContain("th");
  });

  it("should detect fatigue drift when fatigueRatio > 1.2", () => {
    // Given timing metadata showing fatigue
    const keyStrokes: KeyStroke[] = [makeKS("a", "x", 0)];
    const timing: SessionTimingMetadata = {
      avgHoldDuration: 80, avgInterKeyDelay: 120, slowestBigrams: [],
      shortPresses: 0, consistencyScore: 70, fatigueRatio: 1.4,
      leftHand: { errors: 0, total: 10, errorRate: 0, avgDelay: 100 },
      rightHand: { errors: 0, total: 10, errorRate: 0, avgDelay: 100 },
    };

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes, [], timing);

    // Then fatigue-drift detected
    const fatigue = patterns.find((p) => p.type === "fatigue-drift");
    expect(fatigue).toBeDefined();
    expect(fatigue!.description).toContain("40%");
  });

  it("should detect burst errors (3+ consecutive incorrect)", () => {
    // Given 4 consecutive errors
    const keyStrokes: KeyStroke[] = [
      makeKS("a", "a", 0),
      makeKS("b", "x", 100), makeKS("c", "y", 200), makeKS("d", "z", 300), makeKS("e", "w", 400),
      makeKS("f", "f", 500),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then burst-errors detected
    const burst = patterns.find((p) => p.type === "burst-errors");
    expect(burst).toBeDefined();
    expect(burst!.frequency).toBeGreaterThanOrEqual(1);
  });

  it("should sort patterns by frequency (most frequent first)", () => {
    // Given errors that trigger multiple patterns with different frequencies
    const keyStrokes: KeyStroke[] = [
      makeKS("a", "s", 0), makeKS("a", "d", 50), makeKS("a", "f", 90),
      makeKS(".", "x", 130), makeKS(",", "y", 170),
    ];

    // When detecting patterns
    const patterns = detectErrorPatterns(keyStrokes);

    // Then sorted by frequency descending
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i].frequency).toBeLessThanOrEqual(patterns[i - 1].frequency);
    }
  });
});

describe("Tips — buildTipPrompt", () => {
  it("should include pattern descriptions in the prompt", () => {
    // Given error patterns
    const patterns = [
      { type: "repeated-char" as const, description: "Repeatedly missing: a", chars: ["a"], frequency: 5 },
    ];

    // When building prompt
    const prompt = buildTipPrompt(patterns, "hello world test text");

    // Then prompt contains the pattern description
    expect(prompt).toContain("Repeatedly missing: a");
    expect(prompt).toContain("5x");
    expect(prompt).toContain("hello world");
  });

  it("should include timing context when metadata provided", () => {
    const patterns = [{ type: "speed-error" as const, description: "Fast errors", chars: [], frequency: 3 }];
    const timing: SessionTimingMetadata = {
      avgHoldDuration: 80, avgInterKeyDelay: 120, slowestBigrams: [],
      shortPresses: 5, consistencyScore: 70, fatigueRatio: 1.3,
      leftHand: { errors: 3, total: 20, errorRate: 15, avgDelay: 100 },
      rightHand: { errors: 1, total: 20, errorRate: 5, avgDelay: 90 },
    };

    const prompt = buildTipPrompt(patterns, "test text here", timing);

    expect(prompt).toContain("Avg key hold: 80ms");
    expect(prompt).toContain("Short presses");
    expect(prompt).toContain("LEFT HAND");
    expect(prompt).toContain("RIGHT HAND");
    expect(prompt).toContain("VERDICT");
  });

  it("should identify left hand as weaker when errorRate > 1.5x right", () => {
    const patterns = [{ type: "repeated-char" as const, description: "test", chars: ["a"], frequency: 1 }];
    const timing: SessionTimingMetadata = {
      avgHoldDuration: 80, avgInterKeyDelay: 120, slowestBigrams: [],
      shortPresses: 0, consistencyScore: 80, fatigueRatio: 1.0,
      leftHand: { errors: 10, total: 30, errorRate: 33, avgDelay: 100 },
      rightHand: { errors: 2, total: 30, errorRate: 7, avgDelay: 90 },
    };

    const prompt = buildTipPrompt(patterns, "test", timing);
    expect(prompt).toContain("LEFT hand is the weaker hand");
  });

  it("should return valid JSON format instruction", () => {
    const patterns = [{ type: "speed-error" as const, description: "test", chars: [], frequency: 1 }];
    const prompt = buildTipPrompt(patterns, "text");
    expect(prompt).toContain('{"tip":');
    expect(prompt).toContain('"explanation"');
  });
});
