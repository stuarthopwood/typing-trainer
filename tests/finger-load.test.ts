import { describe, it, expect } from "vitest";
import { computeFingerLoad, getOverloadedFingers, getWeakFingers } from "@/lib/finger-load";
import type { KeyStroke } from "@/lib/types";

function makeKS(expected: string, correct = true, delay = 100): KeyStroke {
  return { expected, actual: correct ? expected : "x", timestamp: 0, correct, interKeyDelay: delay };
}

describe("Finger Load — computeFingerLoad", () => {
  it("should compute load distribution per finger", () => {
    const keyStrokes: KeyStroke[] = [
      makeKS("a"), makeKS("a"), makeKS("a"), // L Pinky x3
      makeKS("j"), makeKS("j"),               // R Index x2
      makeKS(" "),                             // Thumbs x1
    ];

    const loads = computeFingerLoad(keyStrokes);
    const lPinky = loads.find((l) => l.finger === "L Pinky");
    const rIndex = loads.find((l) => l.finger === "R Index");

    expect(lPinky?.keystrokes).toBe(3);
    expect(lPinky?.percentage).toBe(50);
    expect(rIndex?.keystrokes).toBe(2);
    expect(rIndex?.percentage).toBe(33);
  });

  it("should compute accuracy per finger", () => {
    const keyStrokes: KeyStroke[] = [
      makeKS("a", true), makeKS("a", false), // L Pinky: 50%
      makeKS("j", true), makeKS("j", true),  // R Index: 100%
    ];

    const loads = computeFingerLoad(keyStrokes);
    expect(loads.find((l) => l.finger === "L Pinky")?.accuracy).toBe(50);
    expect(loads.find((l) => l.finger === "R Index")?.accuracy).toBe(100);
  });

  it("should compute average delay per finger", () => {
    const keyStrokes: KeyStroke[] = [
      makeKS("a", true, 100), makeKS("a", true, 200),
    ];

    const loads = computeFingerLoad(keyStrokes);
    expect(loads.find((l) => l.finger === "L Pinky")?.avgDelay).toBe(150);
  });

  it("should return empty for no keystrokes", () => {
    expect(computeFingerLoad([])).toEqual([]);
  });
});

describe("Finger Load — getOverloadedFingers", () => {
  it("should flag fingers with >1.5x average load", () => {
    const loads = [
      { finger: "L Pinky", keystrokes: 50, percentage: 50, accuracy: 90, avgDelay: 100 },
      { finger: "R Index", keystrokes: 10, percentage: 10, accuracy: 90, avgDelay: 100 },
      { finger: "L Middle", keystrokes: 10, percentage: 10, accuracy: 90, avgDelay: 100 },
    ];
    const overloaded = getOverloadedFingers(loads);
    expect(overloaded).toContain("L Pinky");
    expect(overloaded).not.toContain("R Index");
  });
});

describe("Finger Load — getWeakFingers", () => {
  it("should flag fingers with <85% accuracy and sufficient attempts", () => {
    const loads = [
      { finger: "L Pinky", keystrokes: 20, percentage: 30, accuracy: 70, avgDelay: 100 },
      { finger: "R Index", keystrokes: 20, percentage: 30, accuracy: 95, avgDelay: 100 },
      { finger: "L Ring", keystrokes: 5, percentage: 10, accuracy: 60, avgDelay: 100 },
    ];
    const weak = getWeakFingers(loads);
    expect(weak).toContain("L Pinky");
    expect(weak).not.toContain("R Index");
    expect(weak).not.toContain("L Ring"); // too few attempts
  });
});
