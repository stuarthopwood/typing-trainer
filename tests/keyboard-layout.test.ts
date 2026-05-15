import { describe, it, expect } from "vitest";
import { getExpectedCodes, KEYCHRON_K2_LAYOUT } from "@/lib/keyboard-layout";

describe("Keyboard Layout — getExpectedCodes", () => {
  it("should return single code for lowercase letter", () => {
    expect(getExpectedCodes("a")).toEqual(["KeyA"]);
    expect(getExpectedCodes("z")).toEqual(["KeyZ"]);
    expect(getExpectedCodes("m")).toEqual(["KeyM"]);
  });

  it("should return ShiftLeft + code for uppercase letter", () => {
    expect(getExpectedCodes("A")).toEqual(["ShiftLeft", "KeyA"]);
    expect(getExpectedCodes("Z")).toEqual(["ShiftLeft", "KeyZ"]);
    expect(getExpectedCodes("M")).toEqual(["ShiftLeft", "KeyM"]);
  });

  it("should return ShiftLeft + code for shifted symbol @", () => {
    expect(getExpectedCodes("@")).toEqual(["ShiftLeft", "Digit2"]);
  });

  it("should return ShiftLeft + code for other shifted symbols", () => {
    expect(getExpectedCodes("!")).toEqual(["ShiftLeft", "Digit1"]);
    expect(getExpectedCodes("#")).toEqual(["ShiftLeft", "Digit3"]);
    expect(getExpectedCodes("$")).toEqual(["ShiftLeft", "Digit4"]);
    expect(getExpectedCodes("^")).toEqual(["ShiftLeft", "Digit6"]);
    expect(getExpectedCodes("?")).toEqual(["ShiftLeft", "Slash"]);
    expect(getExpectedCodes("{")).toEqual(["ShiftLeft", "BracketLeft"]);
    expect(getExpectedCodes("}")).toEqual(["ShiftLeft", "BracketRight"]);
  });

  it("should return Space for space character", () => {
    expect(getExpectedCodes(" ")).toEqual(["Space"]);
  });

  it("should return Enter for newline character", () => {
    expect(getExpectedCodes("\n")).toEqual(["Enter"]);
  });

  it("should return single code for unshifted symbols", () => {
    expect(getExpectedCodes(";")).toEqual(["Semicolon"]);
    expect(getExpectedCodes(",")).toEqual(["Comma"]);
    expect(getExpectedCodes(".")).toEqual(["Period"]);
    expect(getExpectedCodes("/")).toEqual(["Slash"]);
    expect(getExpectedCodes("[")).toEqual(["BracketLeft"]);
    expect(getExpectedCodes("]")).toEqual(["BracketRight"]);
    expect(getExpectedCodes("-")).toEqual(["Minus"]);
    expect(getExpectedCodes("=")).toEqual(["Equal"]);
  });

  it("should return single code for digit characters", () => {
    expect(getExpectedCodes("1")).toEqual(["Digit1"]);
    expect(getExpectedCodes("0")).toEqual(["Digit0"]);
    expect(getExpectedCodes("5")).toEqual(["Digit5"]);
  });

  it("should return empty array for unknown character", () => {
    expect(getExpectedCodes("é")).toEqual([]);
    expect(getExpectedCodes("☃")).toEqual([]);
  });
});

describe("Keyboard Layout — KEYCHRON_K2_LAYOUT", () => {
  it("should have 6 rows", () => {
    expect(KEYCHRON_K2_LAYOUT).toHaveLength(6);
  });

  it("row 1 (function row) should have 15 keys", () => {
    expect(KEYCHRON_K2_LAYOUT[0]).toHaveLength(15);
  });

  it("row 2 (numbers) should have 15 keys", () => {
    expect(KEYCHRON_K2_LAYOUT[1]).toHaveLength(15);
  });

  it("row 3 (QWERTY) should have 15 keys", () => {
    expect(KEYCHRON_K2_LAYOUT[2]).toHaveLength(15);
  });

  it("row 4 (home row) should have 14 keys", () => {
    expect(KEYCHRON_K2_LAYOUT[3]).toHaveLength(14);
  });

  it("row 5 (bottom alpha) should have 14 keys", () => {
    expect(KEYCHRON_K2_LAYOUT[4]).toHaveLength(14);
  });

  it("row 6 (modifiers + space) should have 10 keys", () => {
    expect(KEYCHRON_K2_LAYOUT[5]).toHaveLength(10);
  });

  it("all keys should have code and label fields", () => {
    for (const row of KEYCHRON_K2_LAYOUT) {
      for (const key of row) {
        expect(key).toHaveProperty("code");
        expect(key).toHaveProperty("label");
        expect(typeof key.code).toBe("string");
        expect(typeof key.label).toBe("string");
      }
    }
  });

  it("should contain standard keys like Space, Enter, Escape", () => {
    const allCodes = KEYCHRON_K2_LAYOUT.flat().map((k) => k.code);
    expect(allCodes).toContain("Space");
    expect(allCodes).toContain("Enter");
    expect(allCodes).toContain("Escape");
    expect(allCodes).toContain("ShiftLeft");
    expect(allCodes).toContain("ShiftRight");
  });
});
