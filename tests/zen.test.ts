import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchZenTopic, checkSpelling, buildZenSessionStats, extractWords, type SpellCheckResult } from "@/lib/zen";
import type { KeyStroke } from "@/lib/types";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();

beforeEach(() => {
  localStorageMock.clear();
  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("fetch", vi.fn());
  vi.stubEnv("NEXT_PUBLIC_PROGRESS_API_KEY", "test-key");
});

describe("Zen — fetchZenTopic", () => {
  it("should return topic string on success", async () => {
    // Given the API returns a topic
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ topic: "Describe your morning routine" }) });
    vi.stubGlobal("fetch", fetchMock);

    // When fetchZenTopic is called
    const topic = await fetchZenTopic();

    // Then it returns the topic text
    expect(topic).toBe("Describe your morning routine");
  });

  it("should return null when API key is missing", async () => {
    // Given no API key
    vi.stubEnv("NEXT_PUBLIC_PROGRESS_API_KEY", "");

    // When fetchZenTopic is called
    const topic = await fetchZenTopic();

    // Then null returned
    expect(topic).toBeNull();
  });

  it("should return null on API failure", async () => {
    // Given the API returns error
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    // When fetchZenTopic is called
    const topic = await fetchZenTopic();

    // Then null returned gracefully
    expect(topic).toBeNull();
  });
});

describe("Zen — checkSpelling", () => {
  it("should return spell-check results for a batch of words", async () => {
    // Given the API returns results
    const results = [
      { word: "teh", correct: false, suggestion: "the", index: 0 },
      { word: "quick", correct: true, suggestion: null, index: 1 },
    ];
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ results }) });
    vi.stubGlobal("fetch", fetchMock);

    // When checkSpelling is called with words + context
    const out = await checkSpelling(["teh", "quick"], "teh quick brown fox");

    // Then results are returned
    expect(out).toHaveLength(2);
    expect(out[0].correct).toBe(false);
    expect(out[0].suggestion).toBe("the");
    expect(out[1].correct).toBe(true);
  });

  it("should return empty array when API key missing", async () => {
    // Given no API key
    vi.stubEnv("NEXT_PUBLIC_PROGRESS_API_KEY", "");

    // When checkSpelling is called
    const results = await checkSpelling(["hello"], "hello world");

    // Then empty array returned
    expect(results).toEqual([]);
  });

  it("should return fallback correct results on timeout/failure", async () => {
    // Given fetch throws (simulating abort)
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("AbortError"));
    vi.stubGlobal("fetch", fetchMock);

    // When checkSpelling is called
    const results = await checkSpelling(["hello"], "hello world");

    // Then fallback results returned (marked correct, no penalty)
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe("hello");
    expect(results[0].correct).toBe(true);
  });
});

describe("Zen — buildZenSessionStats", () => {
  it("should calculate WPM from keystrokes and duration", () => {
    // Given 50 chars typed over 30 seconds
    const keyStrokes: KeyStroke[] = [
      { expected: "a", actual: "a", timestamp: 0, correct: true },
      ...Array.from({ length: 49 }, (_, i) => ({
        expected: "a", actual: "a", timestamp: (i + 1) * 600, correct: true,
      })),
    ];
    const text = "a".repeat(50);
    const spellResults = new Map<number, SpellCheckResult>();

    // When buildZenSessionStats is called
    const stats = buildZenSessionStats(keyStrokes, text, spellResults, "Test topic");

    // Then WPM is calculated (50 chars / 5 = 10 words, over ~29.4s ≈ 0.49 min → ~20 WPM)
    expect(stats.wpm).toBeGreaterThan(15);
    expect(stats.wpm).toBeLessThan(25);
    expect(stats.wordCount).toBe(1); // one continuous string
    expect(stats.topic).toBe("Test topic");
  });

  it("should calculate accuracy from spell-check results", () => {
    // Given 5 words checked, 1 misspelled
    const text = "the quikc brown fox jumps";
    const spellResults = new Map<number, SpellCheckResult>();
    spellResults.set(0, { word: "the", correct: true, suggestion: null, index: 0 });
    spellResults.set(4, { word: "quikc", correct: false, suggestion: "quick", index: 1 });
    spellResults.set(10, { word: "brown", correct: true, suggestion: null, index: 2 });
    spellResults.set(16, { word: "fox", correct: true, suggestion: null, index: 3 });
    spellResults.set(20, { word: "jumps", correct: true, suggestion: null, index: 4 });

    const keyStrokes: KeyStroke[] = [
      { expected: "t", actual: "t", timestamp: 0, correct: true },
      { expected: "h", actual: "h", timestamp: 100, correct: true },
    ];

    // When buildZenSessionStats is called
    const stats = buildZenSessionStats(keyStrokes, text, spellResults, "topic");

    // Then accuracy is 4/5 = 80%
    expect(stats.accuracy).toBe(80);
    expect(stats.misspelledWords).toEqual(["quikc"]);
  });

  it("should return 100% accuracy when no spell results exist", () => {
    // Given no spell-check results (API was unconfigured)
    const text = "hello world";
    const spellResults = new Map<number, SpellCheckResult>();
    const keyStrokes: KeyStroke[] = [
      { expected: "h", actual: "h", timestamp: 0, correct: true },
      { expected: "e", actual: "e", timestamp: 100, correct: true },
    ];

    // When buildZenSessionStats is called
    const stats = buildZenSessionStats(keyStrokes, text, spellResults, "topic");

    // Then accuracy defaults to 100%
    expect(stats.accuracy).toBe(100);
    expect(stats.misspelledWords).toEqual([]);
  });
});

describe("Zen — extractWords", () => {
  it("should extract words with their positions", () => {
    // Given text with multiple words
    const text = "hello world foo";

    // When extractWords is called
    const words = extractWords(text);

    // Then each word has correct start/end indices
    expect(words).toHaveLength(3);
    expect(words[0]).toEqual({ word: "hello", startIndex: 0, endIndex: 5 });
    expect(words[1]).toEqual({ word: "world", startIndex: 6, endIndex: 11 });
    expect(words[2]).toEqual({ word: "foo", startIndex: 12, endIndex: 15 });
  });

  it("should handle multiple spaces between words", () => {
    const text = "hello   world";
    const words = extractWords(text);
    expect(words).toHaveLength(2);
    expect(words[0].word).toBe("hello");
    expect(words[1].word).toBe("world");
  });
});
