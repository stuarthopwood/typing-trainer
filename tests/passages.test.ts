import { describe, it, expect } from "vitest";
import { PASSAGES, getRandomPassage } from "@/lib/passages";

describe("Passages — Data Integrity", () => {
  it("should have at least 10 passages", () => {
    expect(PASSAGES.length).toBeGreaterThanOrEqual(10);
  });

  it("each passage should have required fields", () => {
    for (const p of PASSAGES) {
      expect(p.id).toBeTruthy();
      expect(p.text.length).toBeGreaterThan(10);
      expect(p.source).toBeTruthy();
      expect(["book", "movie", "code", "quote"]).toContain(p.category);
      expect(["beginner", "intermediate", "advanced"]).toContain(p.difficulty);
    }
  });

  it("should have unique IDs", () => {
    const ids = PASSAGES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have passages across all difficulties", () => {
    const difficulties = new Set(PASSAGES.map((p) => p.difficulty));
    expect(difficulties.has("beginner")).toBe(true);
    expect(difficulties.has("intermediate")).toBe(true);
    expect(difficulties.has("advanced")).toBe(true);
  });

  it("should have passages across multiple categories", () => {
    const categories = new Set(PASSAGES.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});

describe("Passages — Random Selection", () => {
  it("should return a passage", () => {
    const passage = getRandomPassage();
    expect(passage).toBeDefined();
    expect(passage.text.length).toBeGreaterThan(0);
  });

  it("should filter by difficulty", () => {
    const passage = getRandomPassage("beginner");
    expect(passage.difficulty).toBe("beginner");
  });

  it("should filter by category", () => {
    const passage = getRandomPassage(undefined, "movie");
    expect(passage.category).toBe("movie");
  });

  it("should fallback to all passages when filter matches nothing", () => {
    const passage = getRandomPassage("beginner", "quote");
    expect(passage).toBeDefined();
  });
});
