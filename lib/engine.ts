import type { KeyStroke, SessionStats, CelebrationTier } from "./types";

export function calculateWpm(correctChars: number, durationMs: number): number {
  if (durationMs === 0) return 0;
  const minutes = durationMs / 60000;
  const words = correctChars / 5;
  return Math.round(words / minutes);
}

export function calculateAccuracy(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

export function buildSessionStats(keyStrokes: KeyStroke[]): SessionStats {
  if (keyStrokes.length === 0) {
    return { wpm: 0, accuracy: 100, totalChars: 0, correctChars: 0, errors: 0, duration: 0, keyStrokes: [] };
  }

  const totalChars = keyStrokes.length;
  const correctChars = keyStrokes.filter((k) => k.correct).length;
  const errors = totalChars - correctChars;
  const duration = keyStrokes[keyStrokes.length - 1].timestamp - keyStrokes[0].timestamp;
  const wpm = calculateWpm(correctChars, duration);
  const accuracy = calculateAccuracy(correctChars, totalChars);

  return { wpm, accuracy, totalChars, correctChars, errors, duration, keyStrokes };
}

export function getCelebrationTier(accuracy: number): CelebrationTier {
  if (accuracy === 100) return "perfect";
  if (accuracy >= 95) return "great";
  if (accuracy >= 90) return "good";
  return "none";
}

export function getErrorHeatmap(keyStrokes: KeyStroke[]): Record<string, number> {
  const errors: Record<string, number> = {};
  for (const stroke of keyStrokes) {
    if (!stroke.correct) {
      errors[stroke.expected] = (errors[stroke.expected] || 0) + 1;
    }
  }
  return errors;
}
