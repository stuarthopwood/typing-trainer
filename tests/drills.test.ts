import { describe, it, expect } from "vitest";
import { DRILL_LEVELS, generateDrillText } from "@/lib/drills";
import type { PracticeTargets } from "@/lib/types";

describe("Drills — Level Configuration", () => {
  it("should have 6 drill levels", () => {
    expect(DRILL_LEVELS).toHaveLength(6);
  });

  it("each level should have unique id, chars, and label", () => {
    const ids = DRILL_LEVELS.map((l) => l.level);
    expect(new Set(ids).size).toBe(ids.length);

    for (const level of DRILL_LEVELS) {
      expect(level.chars.length).toBeGreaterThan(0);
      expect(level.label.length).toBeGreaterThan(0);
    }
  });

  it("home-row should contain asdf and jkl;", () => {
    const homeRow = DRILL_LEVELS.find((l) => l.level === "home-row");
    expect(homeRow?.chars).toContain("a");
    expect(homeRow?.chars).toContain("f");
    expect(homeRow?.chars).toContain("j");
    expect(homeRow?.chars).toContain(";");
  });
});

describe("Drills — Text Generation", () => {
  it("should generate text containing real words", () => {
    const config = DRILL_LEVELS[0]; // home-row
    const text = generateDrillText(config, 20);

    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain(" ");
    const words = text.split(" ");
    for (const word of words) {
      expect(word.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should generate text approximately the requested length", () => {
    const config = DRILL_LEVELS[0];
    const text = generateDrillText(config, 40);
    expect(text.length).toBeGreaterThanOrEqual(30);
    expect(text.length).toBeLessThan(100);
  });

  it("should contain spaces (multiple words)", () => {
    const config = DRILL_LEVELS[0];
    const text = generateDrillText(config, 30);
    expect(text).toContain(" ");
  });

  it("should generate different text each time", () => {
    const config = DRILL_LEVELS[0];
    const a = generateDrillText(config, 40);
    const b = generateDrillText(config, 40);
    expect(a).not.toBe(b);
  });
});

describe("Drills — Adaptive Targeting", () => {
  it("should bias toward words containing target chars", () => {
    const config = DRILL_LEVELS[0]; // home-row
    const targets: PracticeTargets = {
      chars: ["s", "h"],
      bigrams: ["sh"],
      updatedAt: new Date().toISOString(),
    };

    // Generate many samples and check that target chars appear more frequently
    let targetCharCount = 0;
    let totalChars = 0;
    for (let i = 0; i < 20; i++) {
      const text = generateDrillText(config, 100, undefined, targets);
      for (const c of text) {
        totalChars++;
        if (c === "s" || c === "h") targetCharCount++;
      }
    }

    // With targeting, "s" and "h" should appear in > 15% of characters
    // (home-row words naturally contain them, but targeting should boost)
    const ratio = targetCharCount / totalChars;
    expect(ratio).toBeGreaterThan(0.15);
  });

  it("should still work without targets (no crash)", () => {
    const config = DRILL_LEVELS[0];
    const text = generateDrillText(config, 40, undefined, undefined);
    expect(text.length).toBeGreaterThan(0);
  });

  it("should still work with empty targets", () => {
    const config = DRILL_LEVELS[0];
    const targets: PracticeTargets = { chars: [], bigrams: [], updatedAt: "" };
    const text = generateDrillText(config, 40, undefined, targets);
    expect(text.length).toBeGreaterThan(0);
  });

  it("should contain target bigram in output when targeting", () => {
    const config = DRILL_LEVELS[0]; // home-row — "sh" words exist (slash, flash, etc.)
    const targets: PracticeTargets = {
      chars: [],
      bigrams: ["sh"],
      updatedAt: new Date().toISOString(),
    };

    // Run enough trials that at least one should hit
    let foundBigram = false;
    for (let i = 0; i < 30; i++) {
      const text = generateDrillText(config, 100, undefined, targets);
      if (text.includes("sh")) {
        foundBigram = true;
        break;
      }
    }
    expect(foundBigram).toBe(true);
  });
});
