import { describe, it, expect, beforeEach, vi } from "vitest";
import { recordGhostFrames, getGhostPosition, computeGhostLead, findBestGhostForText, saveGhostSession, getGhostSessions } from "@/lib/ghost-race";
import type { KeyStroke } from "@/lib/types";

describe("Ghost Race — recordGhostFrames", () => {
  it("should record position at each correct keystroke timestamp", () => {
    const keyStrokes: KeyStroke[] = [
      { expected: "h", actual: "h", timestamp: 0, correct: true },
      { expected: "e", actual: "e", timestamp: 100, correct: true },
      { expected: "l", actual: "x", timestamp: 200, correct: false },
      { expected: "l", actual: "l", timestamp: 300, correct: true },
    ];

    const frames = recordGhostFrames(keyStrokes);

    // Position 0 at start, then increments on correct only
    expect(frames[0]).toEqual({ position: 0, timestamp: 0 });
    expect(frames[1]).toEqual({ position: 1, timestamp: 0 });
    expect(frames[2]).toEqual({ position: 2, timestamp: 100 });
    // No frame for error at 200
    expect(frames[3]).toEqual({ position: 3, timestamp: 300 });
  });
});

describe("Ghost Race — getGhostPosition", () => {
  it("should interpolate ghost position at given elapsed time", () => {
    const frames = [
      { position: 0, timestamp: 1000 },
      { position: 5, timestamp: 2000 },
      { position: 10, timestamp: 3000 },
    ];

    // At 1500ms elapsed (timestamp 2500), ghost is at position 5 (last frame <= 2500)
    expect(getGhostPosition(frames, 1500)).toBe(5);
    // At 0ms, ghost hasn't moved
    expect(getGhostPosition(frames, 0)).toBe(0);
    // At 2000ms (timestamp 3000), ghost is at 10
    expect(getGhostPosition(frames, 2000)).toBe(10);
  });

  it("should return 0 for empty frames", () => {
    expect(getGhostPosition([], 1000)).toBe(0);
  });
});

describe("Ghost Race — computeGhostLead", () => {
  it("should report player ahead when position is higher", () => {
    const result = computeGhostLead(50, 40, 100);
    expect(result.ahead).toBe(true);
    expect(result.chars).toBe(10);
    expect(result.percentage).toBe(10);
  });

  it("should report ghost ahead when player behind", () => {
    const result = computeGhostLead(30, 45, 100);
    expect(result.ahead).toBe(false);
    expect(result.chars).toBe(15);
    expect(result.percentage).toBe(15);
  });
});

describe("Ghost Race — storage", () => {
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

  it("should save and retrieve ghost sessions", () => {
    saveGhostSession({ id: "g1", text: "hello", wpm: 40, accuracy: 95, date: "2026-05-20", frames: [] });
    const ghosts = getGhostSessions();
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].id).toBe("g1");
  });

  it("should find best ghost for a given text", () => {
    saveGhostSession({ id: "g1", text: "hello world", wpm: 30, accuracy: 90, date: "2026-05-19", frames: [] });
    saveGhostSession({ id: "g2", text: "hello world", wpm: 45, accuracy: 92, date: "2026-05-20", frames: [] });
    saveGhostSession({ id: "g3", text: "different text", wpm: 60, accuracy: 98, date: "2026-05-20", frames: [] });

    const best = findBestGhostForText("hello world");
    expect(best?.id).toBe("g2");
    expect(best?.wpm).toBe(45);
  });

  it("should return null when no ghost matches text", () => {
    expect(findBestGhostForText("nonexistent")).toBeNull();
  });
});
