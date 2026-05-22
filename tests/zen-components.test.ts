import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { extractWords, buildZenSessionStats, checkSpelling, fetchZenTopic, type SpellCheckResult } from "@/lib/zen";
import { recordSession } from "@/lib/progress";
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

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================================
// US1 — Free-Type on a Generated Topic
// ============================================================

describe("Zen Mode — US1: Free-Type on Generated Topic", () => {
  it("should generate an AI topic prompt when zen mode is activated (US1.1)", async () => {
    // Given an API key is configured and the endpoint returns a topic
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ topic: "Describe your morning routine" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // When fetchZenTopic is called
    const topic = await fetchZenTopic();

    // Then a topic prompt is returned
    expect(topic).toBe("Describe your morning routine");
    expect(fetchMock).toHaveBeenCalledWith("/api/zen-topic", expect.objectContaining({ method: "POST" }));
  });

  it("should track word count from typed text (US1.4 — Done button gating)", () => {
    // Given text with various word counts
    // When extractWords is called
    const empty = extractWords("");
    const underMin = extractWords("hello world foo bar");
    const atMin = extractWords("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty");

    // Then word count reflects actual words
    expect(empty.length).toBe(0);
    expect(underMin.length).toBe(4);
    expect(atMin.length).toBe(20);
  });

  it("should calculate WPM and word count in session summary (US1.5)", () => {
    // Given a completed zen session with 30 chars over 12 seconds
    const keyStrokes: KeyStroke[] = Array.from({ length: 30 }, (_, i) => ({
      expected: "a", actual: "a", timestamp: i * 400, correct: true,
    }));
    const text = "hello world this is a test for zen mode typing";
    const spellResults = new Map<number, SpellCheckResult>();

    // When buildZenSessionStats is called
    const stats = buildZenSessionStats(keyStrokes, text, spellResults, "Test topic");

    // Then WPM is calculated from chars/5/duration and word count is correct
    expect(stats.wordCount).toBe(10);
    expect(stats.wpm).toBeGreaterThan(0);
    expect(stats.topic).toBe("Test topic");
  });

  it("should cancel session when New Topic is pressed (US1.6)", async () => {
    // Given a zen session is in progress (text has been typed)
    // When New Topic is pressed, fetchZenTopic is called fresh
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ topic: "New topic here" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const topic = await fetchZenTopic();

    // Then a new topic is generated (the caller resets state)
    expect(topic).toBe("New topic here");
  });
});

// ============================================================
// US2 — Real-Time Spell-Checking
// ============================================================

describe("Zen Mode — US2: Real-Time Spell-Checking", () => {
  it("should batch spell-check words and return results (US2.1/US2.2)", async () => {
    // Given the spell-check API returns results for a batch
    const apiResults = [
      { word: "teh", correct: false, suggestion: "the", index: 0 },
      { word: "quick", correct: true, suggestion: null, index: 1 },
      { word: "browm", correct: false, suggestion: "brown", index: 2 },
    ];
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: apiResults }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // When checkSpelling is called with a batch of words + context
    const results = await checkSpelling(["teh", "quick", "browm"], "teh quick browm fox");

    // Then misspelled words are identified with suggestions
    expect(results).toHaveLength(3);
    expect(results[0].correct).toBe(false);
    expect(results[0].suggestion).toBe("the");
    expect(results[1].correct).toBe(true);
    expect(results[2].correct).toBe(false);
    expect(results[2].suggestion).toBe("brown");
  });

  it("should handle spell-check timeout gracefully (US2.4)", async () => {
    // Given the spell-check API times out
    const abortError = new DOMException("The operation was aborted.", "AbortError");
    const fetchMock = vi.fn().mockRejectedValueOnce(abortError);
    vi.stubGlobal("fetch", fetchMock);

    // When checkSpelling is called
    const results = await checkSpelling(["hello"], "hello world");

    // Then empty results returned (words marked unchecked, not penalised)
    expect(results).toEqual([]);
  });

  it("should calculate accuracy from spell-check results (US2.6)", () => {
    // Given a session with 10 words checked, 2 misspelled
    const text = "the quikc brown fox jumps ovr the lazy dog today";
    const spellResults = new Map<number, SpellCheckResult>();
    const words = extractWords(text);
    words.forEach((w, i) => {
      const correct = w.word !== "quikc" && w.word !== "ovr";
      spellResults.set(w.startIndex, { word: w.word, correct, suggestion: correct ? null : "fixed", index: i });
    });
    const keyStrokes: KeyStroke[] = [
      { expected: "t", actual: "t", timestamp: 0, correct: true },
      { expected: "h", actual: "h", timestamp: 100, correct: true },
    ];

    // When buildZenSessionStats calculates accuracy
    const stats = buildZenSessionStats(keyStrokes, text, spellResults, "topic");

    // Then accuracy = (8 correct / 10 checked) * 100 = 80%
    expect(stats.accuracy).toBe(80);
    expect(stats.misspelledWords).toContain("quikc");
    expect(stats.misspelledWords).toContain("ovr");
    expect(stats.misspelledWords).toHaveLength(2);
  });
});

// ============================================================
// US3 — Session Recording & Progression
// ============================================================

describe("Zen Mode — US3: Session Recording & Progression", () => {
  it("should record zen session with XP and streak (US3.1)", () => {
    // Given an empty progress state
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 0, totalCharsTyped: 0, bestWpm: 0, bestAccuracy: 0,
      currentStreak: 0, bestStreak: 0, lastSessionDate: "",
      recentSessions: [], errorHeatmap: {}, levelProgress: {},
      xp: 0, achievements: [], tips: [], drillLowAccuracyStreak: {},
    }));

    // When a zen session is recorded
    const stats = { wpm: 25, accuracy: 90, totalChars: 100, correctChars: 90, errors: 2, duration: 30000, keyStrokes: [] as KeyStroke[] };
    const { progress } = recordSession(stats, "zen", { modeDetails: { type: "zen", topic: "Test" } });

    // Then totalSessions increments and streak counts
    expect(progress.totalSessions).toBe(1);
    expect(progress.currentStreak).toBe(1);
  });

  it("should NOT include zen sessions in bestWpm/bestAccuracy (US3.5)", () => {
    // Given a drill session with bestWpm=15
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 1, totalCharsTyped: 50, bestWpm: 15, bestAccuracy: 90,
      currentStreak: 1, bestStreak: 1, lastSessionDate: new Date().toISOString().split("T")[0],
      recentSessions: [], errorHeatmap: {}, levelProgress: {},
      xp: 10, achievements: [], tips: [], drillLowAccuracyStreak: {},
    }));

    // When a zen session with 50 WPM is recorded
    const stats = { wpm: 50, accuracy: 95, totalChars: 200, correctChars: 190, errors: 1, duration: 30000, keyStrokes: [] as KeyStroke[] };
    const { progress } = recordSession(stats, "zen", { modeDetails: { type: "zen", topic: "Test" } });

    // Then bestWpm remains 15 (zen excluded from aggregates)
    expect(progress.bestWpm).toBe(15);
    expect(progress.bestAccuracy).toBe(90);
  });

  it("should NOT include zen sessions in drill level progress (US3.3)", () => {
    // Given progress with some drill level progress
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 5, totalCharsTyped: 250, bestWpm: 15, bestAccuracy: 90,
      currentStreak: 1, bestStreak: 1, lastSessionDate: new Date().toISOString().split("T")[0],
      recentSessions: [], errorHeatmap: {}, levelProgress: { "drill:home-row": 3 },
      xp: 30, achievements: [], tips: [], drillLowAccuracyStreak: {},
    }));

    // When a zen session with 95% accuracy is recorded
    const stats = { wpm: 30, accuracy: 95, totalChars: 100, correctChars: 95, errors: 1, duration: 30000, keyStrokes: [] as KeyStroke[] };
    const { progress } = recordSession(stats, "zen", { modeDetails: { type: "zen", topic: "Test" } });

    // Then drill:home-row progress stays at 3 (zen does NOT qualify)
    expect(progress.levelProgress["drill:home-row"]).toBe(3);
    expect(progress.levelProgress["zen"]).toBeUndefined();
  });

  it("should NOT add zen keystrokes to error heatmap (US3.4)", () => {
    // Given empty progress
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 0, totalCharsTyped: 0, bestWpm: 0, bestAccuracy: 0,
      currentStreak: 0, bestStreak: 0, lastSessionDate: "",
      recentSessions: [], errorHeatmap: {}, levelProgress: {},
      xp: 0, achievements: [], tips: [], drillLowAccuracyStreak: {},
    }));

    // When a zen session with "incorrect" keystrokes is recorded
    const keyStrokes: KeyStroke[] = [
      { expected: "a", actual: "b", timestamp: 0, correct: false },
      { expected: "c", actual: "d", timestamp: 100, correct: false },
    ];
    const stats = { wpm: 10, accuracy: 50, totalChars: 2, correctChars: 0, errors: 2, duration: 5000, keyStrokes };
    const { progress } = recordSession(stats, "zen", { modeDetails: { type: "zen", topic: "Test" } });

    // Then error heatmap remains empty (zen keystrokes excluded)
    expect(progress.errorHeatmap).toEqual({});
  });

  it("should tag zen sessions with topic in modeDetails (US3.6)", () => {
    // Given empty progress
    localStorageMock.setItem("typing-trainer-progress", JSON.stringify({
      totalSessions: 0, totalCharsTyped: 0, bestWpm: 0, bestAccuracy: 0,
      currentStreak: 0, bestStreak: 0, lastSessionDate: "",
      recentSessions: [], errorHeatmap: {}, levelProgress: {},
      xp: 0, achievements: [], tips: [], drillLowAccuracyStreak: {},
    }));

    // When a zen session is recorded with enrichment
    const stats = { wpm: 20, accuracy: 85, totalChars: 100, correctChars: 85, errors: 3, duration: 30000, keyStrokes: [] as KeyStroke[] };
    const { session } = recordSession(stats, "zen", {
      modeDetails: { type: "zen", topic: "Describe your day", wordCount: 25, misspelledWords: ["teh"] },
    });

    // Then the session record contains zen mode details with topic
    expect(session.modeDetails.type).toBe("zen");
    expect(session.modeDetails.topic).toBe("Describe your day");
  });
});

// ============================================================
// US4 — Mode Visibility & API Gating
// ============================================================

describe("Zen Mode — US4: Mode Visibility & API Gating", () => {
  it("should return null when no API key configured (US4.1)", async () => {
    // Given no API key is set
    vi.stubEnv("NEXT_PUBLIC_PROGRESS_API_KEY", "");

    // When fetchZenTopic is called
    const topic = await fetchZenTopic();

    // Then null returned (mode should be hidden by caller)
    expect(topic).toBeNull();
  });

  it("should return null on topic generation failure (US4.3)", async () => {
    // Given the API returns an error
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    // When fetchZenTopic is called
    const topic = await fetchZenTopic();

    // Then null returned (caller should show retry UI)
    expect(topic).toBeNull();
  });
});

// ============================================================
// Edge Cases
// ============================================================

describe("Zen Mode — Edge Cases", () => {
  it("should not count spaces/punctuation-only as words", () => {
    // Given text with only spaces and punctuation
    const spacesOnly = extractWords("     ");
    const punctOnly = extractWords("... !!! ???");

    // Then word count reflects non-whitespace tokens
    expect(spacesOnly.length).toBe(0);
    expect(punctOnly.length).toBe(3); // "..." "!!!" "???" are tokens
  });

  it("should handle empty string gracefully", () => {
    const words = extractWords("");
    expect(words).toEqual([]);
  });

  it("should handle unicode and emoji in text", () => {
    // Given text with emoji
    const words = extractWords("hello 👋 world 🌍 test");

    // Then each token (including emoji) counts as a word
    expect(words.length).toBe(5);
    expect(words[1].word).toBe("👋");
  });

  it("should handle leading and trailing whitespace", () => {
    const words = extractWords("  hello world  ");
    expect(words.length).toBe(2);
    expect(words[0].word).toBe("hello");
    expect(words[1].word).toBe("world");
  });

  it("should handle newlines and tabs", () => {
    const words = extractWords("hello\nworld\tfoo");
    expect(words.length).toBe(3);
  });

  it("should return 100% accuracy when all words are correct", () => {
    const text = "hello world test";
    const words = extractWords(text);
    const spellResults = new Map<number, SpellCheckResult>();
    words.forEach((w, i) => {
      spellResults.set(w.startIndex, { word: w.word, correct: true, suggestion: null, index: i });
    });
    const keyStrokes: KeyStroke[] = [
      { expected: "h", actual: "h", timestamp: 0, correct: true },
      { expected: "e", actual: "e", timestamp: 100, correct: true },
    ];

    const stats = buildZenSessionStats(keyStrokes, text, spellResults, "topic");
    expect(stats.accuracy).toBe(100);
    expect(stats.misspelledWords).toEqual([]);
  });

  it("should handle checkSpelling with empty words array", async () => {
    const results = await checkSpelling([], "context");
    expect(results).toEqual([]);
  });
});
