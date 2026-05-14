import { describe, it, expect } from "vitest";
import { DRILL_LEVELS, generateDrillText } from "@/lib/drills";

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
  it("should generate text from the given level's character set", () => {
    const config = DRILL_LEVELS[0]; // home-row
    const text = generateDrillText(config, 20);

    for (const char of text) {
      if (char === " ") continue;
      expect(config.chars).toContain(char);
    }
  });

  it("should generate text approximately the requested length", () => {
    const config = DRILL_LEVELS[0];
    const text = generateDrillText(config, 40);
    expect(text.length).toBeGreaterThanOrEqual(40);
    expect(text.length).toBeLessThan(80);
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
