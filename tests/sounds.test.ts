import { describe, it, expect } from "vitest";
import { playKeyClick, playKeyError } from "@/lib/sounds";

describe("Sounds — playKeyClick", () => {
  it("should not throw when called", () => {
    expect(() => playKeyClick()).not.toThrow();
  });

  it("should be callable multiple times without error", () => {
    expect(() => {
      playKeyClick();
      playKeyClick();
      playKeyClick();
    }).not.toThrow();
  });
});

describe("Sounds — playKeyError", () => {
  it("should not throw when called", () => {
    expect(() => playKeyError()).not.toThrow();
  });

  it("should be callable multiple times without error", () => {
    expect(() => {
      playKeyError();
      playKeyError();
      playKeyError();
    }).not.toThrow();
  });
});
