import { describe, it, expect } from "vitest";
import { getGlowClass } from "@/lib/celebrations";

describe("Celebrations — Glow Classes", () => {
  it("should return pulse class for perfect tier", () => {
    const cls = getGlowClass("perfect");
    expect(cls).toContain("animate-pulse");
    expect(cls).toContain("shadow");
  });

  it("should return shadow class for great tier", () => {
    const cls = getGlowClass("great");
    expect(cls).toContain("shadow");
    expect(cls).not.toContain("animate-pulse");
  });

  it("should return shadow class for good tier", () => {
    const cls = getGlowClass("good");
    expect(cls).toContain("shadow");
  });

  it("should return empty string for none tier", () => {
    expect(getGlowClass("none")).toBe("");
  });
});
