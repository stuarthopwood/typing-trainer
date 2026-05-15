import type { KeyStroke } from "./types";

export interface ErrorPattern {
  type: "repeated-char" | "adjacent-swap" | "wrong-hand" | "speed-error" | "capitalization" | "punctuation";
  description: string;
  chars: string[];
  frequency: number;
}

export interface Tip {
  id: string;
  text: string;
  pattern: string;
  createdAt: string;
}

export function detectErrorPatterns(keyStrokes: KeyStroke[], recentHistory?: KeyStroke[]): ErrorPattern[] {
  const errors = keyStrokes.filter((k) => !k.correct);
  if (errors.length === 0) return [];

  const patterns: ErrorPattern[] = [];
  const allErrors = recentHistory ? [...recentHistory.filter((k) => !k.correct), ...errors] : errors;

  // Repeated character errors (same key missed multiple times)
  const charErrors: Record<string, number> = {};
  for (const e of allErrors) {
    charErrors[e.expected] = (charErrors[e.expected] || 0) + 1;
  }
  const repeatedChars = Object.entries(charErrors).filter(([, count]) => count >= 2);
  if (repeatedChars.length > 0) {
    patterns.push({
      type: "repeated-char",
      description: `Repeatedly missing: ${repeatedChars.map(([c]) => c === " " ? "space" : c).join(", ")}`,
      chars: repeatedChars.map(([c]) => c),
      frequency: repeatedChars.reduce((sum, [, n]) => sum + n, 0),
    });
  }

  // Adjacent key swaps (typed the next char instead of current)
  let swapCount = 0;
  const swapPairs: string[] = [];
  for (const e of errors) {
    if (e.actual.length === 1 && e.expected.length === 1) {
      const idx = keyStrokes.indexOf(e);
      if (idx < keyStrokes.length - 1 && keyStrokes[idx + 1]?.expected === e.actual) {
        swapCount++;
        swapPairs.push(`${e.expected}${e.actual}`);
      }
    }
  }
  if (swapCount > 0) {
    patterns.push({
      type: "adjacent-swap",
      description: `Swapping adjacent characters: ${swapPairs.slice(0, 3).join(", ")}`,
      chars: swapPairs,
      frequency: swapCount,
    });
  }

  // Speed-related errors (errors clustered at high speed)
  const errorTimings: number[] = [];
  for (let i = 1; i < keyStrokes.length; i++) {
    if (!keyStrokes[i].correct) {
      const gap = keyStrokes[i].timestamp - keyStrokes[i - 1].timestamp;
      errorTimings.push(gap);
    }
  }
  const fastErrors = errorTimings.filter((t) => t < 100);
  if (fastErrors.length >= 2) {
    patterns.push({
      type: "speed-error",
      description: "Errors happening at high speed — you may be typing faster than your accuracy allows",
      chars: [],
      frequency: fastErrors.length,
    });
  }

  // Capitalization errors
  const capErrors = errors.filter((e) => e.expected.toLowerCase() === e.actual.toLowerCase() && e.expected !== e.actual);
  if (capErrors.length > 0) {
    patterns.push({
      type: "capitalization",
      description: `Capitalization mistakes: ${capErrors.map((e) => `expected "${e.expected}" got "${e.actual}"`).slice(0, 3).join(", ")}`,
      chars: capErrors.map((e) => e.expected),
      frequency: capErrors.length,
    });
  }

  // Punctuation errors
  const punctuation = new Set(".,;:!?'\"()-[]{}/<>");
  const punctErrors = errors.filter((e) => punctuation.has(e.expected));
  if (punctErrors.length >= 2) {
    patterns.push({
      type: "punctuation",
      description: `Struggling with punctuation: ${[...new Set(punctErrors.map((e) => e.expected))].join(" ")}`,
      chars: punctErrors.map((e) => e.expected),
      frequency: punctErrors.length,
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

export function buildTipPrompt(patterns: ErrorPattern[], currentText: string): string {
  const patternDescriptions = patterns.map((p) => `- ${p.description} (${p.frequency}x)`).join("\n");

  return `You are a typing coach. Based on these error patterns from a typing exercise, give ONE short, actionable tip (max 15 words) to help improve. Be specific and encouraging.

Text being typed: "${currentText.slice(0, 80)}..."

Error patterns detected:
${patternDescriptions}

Reply with ONLY the tip, no prefix, no quotes, no explanation.`;
}
