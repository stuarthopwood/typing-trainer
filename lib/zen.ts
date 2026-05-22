import type { KeyStroke } from "./types";

export interface SpellCheckResult {
  word: string;
  correct: boolean;
  suggestion: string | null;
  index: number;
}

export async function fetchZenTopic(): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("/api/zen-topic", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.topic || null;
  } catch {
    return null;
  }
}

export async function checkSpelling(words: string[], context: string): Promise<SpellCheckResult[]> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  if (!apiKey || words.length === 0) return [];

  const allResults: SpellCheckResult[] = [];

  for (let i = 0; i < words.length; i += 5) {
    const batch = words.slice(i, i + 5);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch("/api/zen-spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ words: batch, context }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!res.ok) {
        allResults.push(...batch.map((w, idx) => ({ word: w, correct: true, suggestion: null, index: i + idx })));
        continue;
      }

      const data = await res.json();
      if (Array.isArray(data.results)) {
        allResults.push(...data.results.map((r: SpellCheckResult, idx: number) => ({ ...r, index: i + idx })));
      }
    } catch {
      allResults.push(...batch.map((w, idx) => ({ word: w, correct: true, suggestion: null, index: i + idx })));
    }
  }

  return allResults;
}

export function buildZenSessionStats(
  keyStrokes: KeyStroke[],
  text: string,
  spellResults: Map<number, SpellCheckResult>,
  topic: string
): { wpm: number; accuracy: number; wordCount: number; duration: number; misspelledWords: string[]; topic: string } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const totalChars = text.length;

  const duration = keyStrokes.length >= 2
    ? keyStrokes[keyStrokes.length - 1].timestamp - keyStrokes[0].timestamp
    : 0;

  const durationMinutes = duration / 60000;
  const wpm = durationMinutes > 0 ? Math.round((totalChars / 5) / durationMinutes) : 0;

  let checkedCount = 0;
  let correctCount = 0;
  const misspelledWords: string[] = [];

  for (const result of spellResults.values()) {
    checkedCount++;
    if (result.correct) {
      correctCount++;
    } else {
      misspelledWords.push(result.word);
    }
  }

  const accuracy = checkedCount > 0 ? Math.round((correctCount / checkedCount) * 100) : 100;

  return { wpm, accuracy, wordCount, duration, misspelledWords, topic };
}

export function extractWords(text: string): { word: string; startIndex: number; endIndex: number }[] {
  const words: { word: string; startIndex: number; endIndex: number }[] = [];
  const regex = /\S+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    words.push({ word: match[0], startIndex: match.index, endIndex: match.index + match[0].length });
  }
  return words;
}
