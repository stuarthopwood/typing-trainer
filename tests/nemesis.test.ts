import { describe, it, expect } from "vitest";
import { computeNemesis, isNemesisDefeated, updateNemesisData, emptyNemesisData } from "@/lib/nemesis";

describe("Nemesis — computeNemesis", () => {
  it("should identify the key with most errors as nemesis", () => {
    // Given an error heatmap with varying error counts
    const heatmap = { q: 15, w: 3, e: 2, r: 8 };

    // When computing nemesis
    const result = computeNemesis(heatmap);

    // Then the key with most errors is the nemesis
    expect(result).not.toBeNull();
    expect(result!.key).toBe("q");
  });

  it("should return null when no key has enough errors", () => {
    // Given a heatmap with very few errors
    const heatmap = { q: 1, w: 1 };

    // When computing nemesis
    const result = computeNemesis(heatmap);

    // Then no nemesis (below minimum threshold)
    expect(result).toBeNull();
  });

  it("should handle empty heatmap", () => {
    expect(computeNemesis({})).toBeNull();
  });

  it("should use totalByKey for accurate accuracy calculation", () => {
    // Given exact per-key totals
    const heatmap = { q: 5, w: 10 };
    const totals = { q: 50, w: 20 }; // q=90% accuracy, w=50% accuracy

    // When computing with totals
    const result = computeNemesis(heatmap, totals);

    // Then w is nemesis (50% < 90%)
    expect(result!.key).toBe("w");
    expect(result!.accuracy).toBe(50);
  });
});

describe("Nemesis — isNemesisDefeated", () => {
  it("should return true when accuracy >= 85%", () => {
    expect(isNemesisDefeated(85)).toBe(true);
    expect(isNemesisDefeated(90)).toBe(true);
  });

  it("should return false when accuracy < 85%", () => {
    expect(isNemesisDefeated(84)).toBe(false);
    expect(isNemesisDefeated(50)).toBe(false);
  });
});

describe("Nemesis — updateNemesisData", () => {
  it("should add defeated nemesis to history when key changes", () => {
    // Given a current nemesis
    const current = { ...emptyNemesisData(), currentKey: "q", accuracy: 60, attempts: 30, since: "2026-05-01T00:00:00Z" };

    // When a new nemesis is crowned
    const updated = updateNemesisData(current, { key: "w", accuracy: 55, attempts: 20 });

    // Then old nemesis moves to history
    expect(updated.currentKey).toBe("w");
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].key).toBe("q");
    expect(updated.history[0].finalAccuracy).toBe(60);
  });

  it("should update accuracy for same nemesis key", () => {
    const current = { ...emptyNemesisData(), currentKey: "q", accuracy: 60, attempts: 30, since: "2026-05-01T00:00:00Z" };
    const updated = updateNemesisData(current, { key: "q", accuracy: 70, attempts: 40 });

    expect(updated.currentKey).toBe("q");
    expect(updated.accuracy).toBe(70);
    expect(updated.history).toHaveLength(0);
  });

  it("should clear nemesis when null provided", () => {
    const current = { ...emptyNemesisData(), currentKey: "q", accuracy: 60, attempts: 30 };
    const updated = updateNemesisData(current, null);
    expect(updated.currentKey).toBeNull();
  });
});
