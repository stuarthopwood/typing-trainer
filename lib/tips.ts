import type { KeyStroke, BigramTiming } from "./types";
import type { SessionTimingMetadata } from "./types";

export interface ErrorPattern {
  type:
    | "repeated-char"
    | "adjacent-swap"
    | "wrong-hand"
    | "speed-error"
    | "capitalization"
    | "punctuation"
    | "shallow-activation"
    | "slipped-finger"
    | "slow-bigrams"
    | "fatigue-drift"
    | "burst-errors";
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

const ADJACENT_KEYS: Record<string, string[]> = {
  q: ["w", "a"], w: ["q", "e", "a", "s"], e: ["w", "r", "s", "d"], r: ["e", "t", "d", "f"],
  t: ["r", "y", "f", "g"], y: ["t", "u", "g", "h"], u: ["y", "i", "h", "j"], i: ["u", "o", "j", "k"],
  o: ["i", "p", "k", "l"], p: ["o", "l"],
  a: ["q", "w", "s", "z"], s: ["a", "w", "e", "d", "z", "x"], d: ["s", "e", "r", "f", "x", "c"],
  f: ["d", "r", "t", "g", "c", "v"], g: ["f", "t", "y", "h", "v", "b"],
  h: ["g", "y", "u", "j", "b", "n"], j: ["h", "u", "i", "k", "n", "m"],
  k: ["j", "i", "o", "l", "m"], l: ["k", "o", "p"],
  z: ["a", "s", "x"], x: ["z", "s", "d", "c"], c: ["x", "d", "f", "v"],
  v: ["c", "f", "g", "b"], b: ["v", "g", "h", "n"], n: ["b", "h", "j", "m"], m: ["n", "j", "k"],
};

function areAdjacent(a: string, b: string): boolean {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  return ADJACENT_KEYS[al]?.includes(bl) || ADJACENT_KEYS[bl]?.includes(al) || false;
}

export function detectErrorPatterns(
  keyStrokes: KeyStroke[],
  recentHistory?: KeyStroke[],
  timingMetadata?: SessionTimingMetadata,
  cumulativeHeatmap?: Record<string, number>
): ErrorPattern[] {
  const errors = keyStrokes.filter((k) => !k.correct);
  if (errors.length === 0) return [];

  const patterns: ErrorPattern[] = [];
  const allErrors = recentHistory ? [...recentHistory.filter((k) => !k.correct), ...errors] : errors;

  // Repeated character errors
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

  // Adjacent key swaps
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

  // Speed-related errors
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

  // Shallow activation — holdDuration < 30ms
  const shallowPresses = errors.filter((e) => e.holdDuration !== undefined && e.holdDuration < 30);
  if (shallowPresses.length >= 3) {
    patterns.push({
      type: "shallow-activation",
      description: `Shallow key presses detected (${shallowPresses.length} presses under 30ms) — your fingers may not be fully actuating the switches`,
      chars: shallowPresses.map((e) => e.expected),
      frequency: shallowPresses.length,
    });
  }

  // Slipped finger — error + short hold + adjacent key
  const slippedFingers = errors.filter((e) =>
    e.holdDuration !== undefined && e.holdDuration < 30 &&
    e.actual.length === 1 && e.expected.length === 1 &&
    areAdjacent(e.expected, e.actual)
  );
  if (slippedFingers.length >= 2) {
    patterns.push({
      type: "slipped-finger",
      description: `Finger slipping to adjacent keys: ${slippedFingers.map((e) => `${e.expected}→${e.actual}`).slice(0, 3).join(", ")}`,
      chars: slippedFingers.map((e) => e.expected),
      frequency: slippedFingers.length,
    });
  }

  // Slow bigrams from timing metadata
  if (timingMetadata?.slowestBigrams && timingMetadata.slowestBigrams.length > 0 && timingMetadata.avgInterKeyDelay > 0) {
    const threshold = timingMetadata.avgInterKeyDelay * 2;
    const slowOnes = timingMetadata.slowestBigrams.filter((b) => b.avgDelay > threshold);
    if (slowOnes.length > 0) {
      patterns.push({
        type: "slow-bigrams",
        description: `Slow transitions: ${slowOnes.slice(0, 5).map((b) => `"${b.bigram}" (${b.avgDelay}ms)`).join(", ")}`,
        chars: slowOnes.map((b) => b.bigram),
        frequency: slowOnes.length,
      });
    }
  }

  // Fatigue drift
  if (timingMetadata && timingMetadata.fatigueRatio > 1.2) {
    patterns.push({
      type: "fatigue-drift",
      description: `Typing speed dropping ${Math.round((timingMetadata.fatigueRatio - 1) * 100)}% by end of session — consider shorter practice sessions`,
      chars: [],
      frequency: 1,
    });
  }

  // Burst errors — 3+ consecutive incorrect
  let burstCount = 0;
  let consecutive = 0;
  for (const k of keyStrokes) {
    if (!k.correct) {
      consecutive++;
      if (consecutive === 3) burstCount++;
      else if (consecutive > 3) burstCount++;
    } else {
      consecutive = 0;
    }
  }
  if (burstCount >= 1) {
    patterns.push({
      type: "burst-errors",
      description: `${burstCount} burst(s) of 3+ consecutive errors — you may be losing finger position`,
      chars: [],
      frequency: burstCount,
    });
  }

  // Chronic problem keys — keys that are problematic in both this session and cumulative history
  if (cumulativeHeatmap) {
    const sessionErrorKeys = Object.keys(charErrors);
    const chronicKeys = sessionErrorKeys.filter((k) => (cumulativeHeatmap[k] || 0) >= 5);
    if (chronicKeys.length > 0) {
      patterns.push({
        type: "repeated-char",
        description: `Chronic problem keys (repeatedly across sessions): ${chronicKeys.map((c) => c === " " ? "space" : c).join(", ")}`,
        chars: chronicKeys,
        frequency: chronicKeys.reduce((sum, k) => sum + (cumulativeHeatmap[k] || 0), 0),
      });
    }
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

export function buildTipPrompt(patterns: ErrorPattern[], currentText: string, timingMetadata?: SessionTimingMetadata): string {
  const patternDescriptions = patterns.map((p) => `- ${p.description} (${p.frequency}x)`).join("\n");

  let timingContext = "";
  if (timingMetadata) {
    const parts: string[] = [];
    if (timingMetadata.avgHoldDuration > 0) parts.push(`Avg key hold: ${timingMetadata.avgHoldDuration}ms`);
    if (timingMetadata.shortPresses > 0) parts.push(`Short presses (<30ms): ${timingMetadata.shortPresses}`);
    if (timingMetadata.fatigueRatio > 1.1) parts.push(`Fatigue: speed drops ${Math.round((timingMetadata.fatigueRatio - 1) * 100)}% by session end`);
    if (timingMetadata.slowestBigrams.length > 0) {
      parts.push(`Slowest pairs: ${timingMetadata.slowestBigrams.slice(0, 3).map((b: BigramTiming) => `"${b.bigram}" ${b.avgDelay}ms`).join(", ")}`);
    }
    if (timingMetadata.leftHand && timingMetadata.rightHand) {
      const l = timingMetadata.leftHand;
      const r = timingMetadata.rightHand;
      parts.push(`Left hand: ${l.errorRate}% error rate, ${l.avgDelay}ms avg delay (${l.total} keys)`);
      parts.push(`Right hand: ${r.errorRate}% error rate, ${r.avgDelay}ms avg delay (${r.total} keys)`);
      if (l.errorRate > r.errorRate * 1.5 && l.total > 5) {
        parts.push(`⚠️ Left hand significantly weaker (${l.errorRate}% vs ${r.errorRate}% errors)`);
      } else if (r.errorRate > l.errorRate * 1.5 && r.total > 5) {
        parts.push(`⚠️ Right hand significantly weaker (${r.errorRate}% vs ${l.errorRate}% errors)`);
      }
    }
    if (parts.length > 0) timingContext = `\n\nTiming analysis:\n${parts.join("\n")}`;
  }

  return `You are a typing coach. Based on these error patterns from a typing exercise, provide a tip with explanation.

Text being typed: "${currentText.slice(0, 80)}..."

Error patterns detected:
${patternDescriptions}${timingContext}

Reply with ONLY valid JSON in this exact format (no markdown, no backticks):
{"tip":"<short actionable tip, max 20 words>","explanation":"<2-3 sentences explaining WHY this helps and HOW to practice it>"}`;
}
