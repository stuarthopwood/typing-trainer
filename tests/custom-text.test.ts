import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateCustomText, paginateText, getCustomPresets, saveCustomPreset, deleteCustomPreset } from "@/lib/custom-text";

describe("Custom Text — validateCustomText", () => {
  it("should accept valid text within bounds", () => {
    const result = validateCustomText("The quick brown fox jumps over the lazy dog");
    expect(result.valid).toBe(true);
    expect(result.cleaned.length).toBeGreaterThanOrEqual(20);
  });

  it("should reject text under minimum length", () => {
    const result = validateCustomText("too short");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Minimum");
  });

  it("should reject text over maximum length", () => {
    const result = validateCustomText("a".repeat(5001));
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum");
  });

  it("should strip non-printable characters", () => {
    const result = validateCustomText("Hello\x00 world\x01 this is a test of cleaning text");
    expect(result.valid).toBe(true);
    expect(result.cleaned).not.toContain("\x00");
    expect(result.cleaned).not.toContain("\x01");
  });

  it("should normalise line endings", () => {
    const result = validateCustomText("line one\r\nline two\rline three\nend");
    expect(result.cleaned).not.toContain("\r");
    expect(result.cleaned).toContain("line one\nline two\nline three\nend");
  });

  it("should handle programming symbols correctly", () => {
    const code = "const fn = (x: number) => { return x * 2; }; // $var @dec #id";
    const result = validateCustomText(code);
    expect(result.valid).toBe(true);
    expect(result.cleaned).toContain("=>");
    expect(result.cleaned).toContain("$var");
    expect(result.cleaned).toContain("{");
    expect(result.cleaned).toContain("}");
  });
});

describe("Custom Text — paginateText", () => {
  it("should return single chunk for short text", () => {
    const chunks = paginateText("Short text under limit");
    expect(chunks).toHaveLength(1);
  });

  it("should split long text into ~200 char chunks at word boundaries", () => {
    const text = "word ".repeat(100); // 500 chars
    const chunks = paginateText(text.trim());
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(210);
    }
  });

  it("should not split mid-word", () => {
    const text = "superlongword ".repeat(20);
    const chunks = paginateText(text.trim());
    for (const chunk of chunks) {
      expect(chunk).not.toMatch(/^\s/);
      expect(chunk).not.toMatch(/\s$/);
    }
  });
});

describe("Custom Text — Presets CRUD", () => {
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

  it("should save and retrieve a preset", () => {
    saveCustomPreset("Test", "This is test content for the preset");
    const presets = getCustomPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe("Test");
    expect(presets[0].text).toContain("test content");
  });

  it("should delete a preset by id", () => {
    const preset = saveCustomPreset("ToDelete", "Content to delete from the list");
    deleteCustomPreset(preset.id);
    expect(getCustomPresets()).toHaveLength(0);
  });

  it("should limit presets to 20", () => {
    for (let i = 0; i < 25; i++) {
      saveCustomPreset(`Preset ${i}`, `Content for preset number ${i} padding`);
    }
    expect(getCustomPresets().length).toBeLessThanOrEqual(20);
  });
});
