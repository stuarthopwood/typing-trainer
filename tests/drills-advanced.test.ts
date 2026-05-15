import { describe, it, expect } from "vitest";
import { generateDrillText, DRILL_LEVELS } from "@/lib/drills";

describe("Drills — generateDrillText with unlockedLevels", () => {
  it("should include some words from the next level when it is unlocked", () => {
    const homeRowConfig = DRILL_LEVELS.find((l) => l.level === "home-row")!;
    const unlockedLevels = new Set(["home-row", "top-row"]);

    // The mix chance is 20%, so run enough times to statistically guarantee
    // at least one occurrence of a top-row word
    let foundTopRowWord = false;

    // Top-row words that are unlikely to appear in home-row bank
    const topRowWords = ["quote", "write", "tower", "power", "query", "route", "type", "wire"];

    for (let i = 0; i < 50; i++) {
      const text = generateDrillText(homeRowConfig, 100, unlockedLevels);
      const words = text.split(" ");
      if (words.some((w) => topRowWords.includes(w))) {
        foundTopRowWord = true;
        break;
      }
    }

    expect(foundTopRowWord).toBe(true);
  });

  it("should not include next level words when next level is NOT unlocked", () => {
    const homeRowConfig = DRILL_LEVELS.find((l) => l.level === "home-row")!;
    const unlockedLevels = new Set(["home-row"]); // top-row NOT unlocked

    const topRowOnlyWords = ["quote", "write", "tower", "power", "query", "route", "type", "wire", "poetry", "equity", "typewriter"];

    // Run many times — should never get top-row words
    for (let i = 0; i < 30; i++) {
      const text = generateDrillText(homeRowConfig, 100, unlockedLevels);
      const words = text.split(" ");
      const hasTopRow = words.some((w) => topRowOnlyWords.includes(w));
      expect(hasTopRow).toBe(false);
    }
  });
});

describe("Drills — generateDrillText without unlockedLevels", () => {
  it("should only use words from the current level's word bank", () => {
    const homeRowConfig = DRILL_LEVELS.find((l) => l.level === "home-row")!;

    // Known top-row-only words that should never appear
    const topRowOnlyWords = ["quote", "write", "tower", "power", "query", "typewriter", "prototype"];

    for (let i = 0; i < 20; i++) {
      const text = generateDrillText(homeRowConfig, 80);
      const words = text.split(" ");
      const hasTopRow = words.some((w) => topRowOnlyWords.includes(w));
      expect(hasTopRow).toBe(false);
    }
  });
});

describe("Drills — generateDrillText length parameter", () => {
  it("should generate text approximately matching the requested length", () => {
    const config = DRILL_LEVELS[0];
    const text = generateDrillText(config, 50);
    // The algorithm adds words until currentLength >= length (counting word.length + 1 for space)
    // The joined result may be slightly shorter due to no trailing space
    expect(text.length).toBeGreaterThanOrEqual(40);
    expect(text.length).toBeLessThan(120);
  });

  it("should respect different length parameters", () => {
    const config = DRILL_LEVELS[0];
    const short = generateDrillText(config, 20);
    const long = generateDrillText(config, 200);
    expect(long.length).toBeGreaterThan(short.length);
  });

  it("should generate shorter text for small length values", () => {
    const config = DRILL_LEVELS[0];
    const text = generateDrillText(config, 10);
    // Should produce at least one word, not excessively long
    expect(text.length).toBeGreaterThan(0);
    expect(text.length).toBeLessThan(80);
  });
});

describe("Drills — Word repetition (30% repeat chance)", () => {
  it("should produce some adjacent repeated words over many runs", () => {
    const config = DRILL_LEVELS.find((l) => l.level === "home-row")!;
    let foundRepeat = false;

    for (let run = 0; run < 50; run++) {
      const text = generateDrillText(config, 100);
      const words = text.split(" ");
      for (let i = 1; i < words.length; i++) {
        if (words[i] === words[i - 1]) {
          foundRepeat = true;
          break;
        }
      }
      if (foundRepeat) break;
    }

    expect(foundRepeat).toBe(true);
  });

  it("should not ALWAYS repeat (randomness check)", () => {
    const config = DRILL_LEVELS.find((l) => l.level === "home-row")!;
    let foundNonRepeat = false;

    for (let run = 0; run < 20; run++) {
      const text = generateDrillText(config, 100);
      const words = text.split(" ");
      for (let i = 1; i < words.length; i++) {
        if (words[i] !== words[i - 1]) {
          foundNonRepeat = true;
          break;
        }
      }
      if (foundNonRepeat) break;
    }

    expect(foundNonRepeat).toBe(true);
  });
});
