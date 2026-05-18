import type { KeyStroke, BigramTiming, SessionTimingMetadata, EnrichedSessionSummary, PracticeTargets, HandStats } from "./types";
import type { ErrorPattern } from "./tips";

const LEFT_HAND_CHARS = new Set([
  "q", "w", "e", "r", "t",
  "a", "s", "d", "f", "g",
  "z", "x", "c", "v", "b",
  "1", "2", "3", "4", "5",
  "`", "~", "!", "@", "#", "$", "%",
  "Q", "W", "E", "R", "T",
  "A", "S", "D", "F", "G",
  "Z", "X", "C", "V", "B",
]);

const RIGHT_HAND_CHARS = new Set([
  "y", "u", "i", "o", "p",
  "h", "j", "k", "l", ";",
  "n", "m", ",", ".", "/",
  "6", "7", "8", "9", "0",
  "^", "&", "*", "(", ")", "-", "_", "=", "+",
  "[", "]", "{", "}", "\\", "|", "'", "\"", ":", "?", "<", ">",
  "Y", "U", "I", "O", "P",
  "H", "J", "K", "L",
  "N", "M",
]);

export function getHand(char: string): "left" | "right" | "neither" {
  if (LEFT_HAND_CHARS.has(char)) return "left";
  if (RIGHT_HAND_CHARS.has(char)) return "right";
  return "neither";
}

export function computeHandStats(keyStrokes: KeyStroke[]): { left: HandStats; right: HandStats } {
  let leftErrors = 0, leftTotal = 0, rightErrors = 0, rightTotal = 0;
  const leftDelays: number[] = [];
  const rightDelays: number[] = [];

  for (let i = 0; i < keyStrokes.length; i++) {
    const stroke = keyStrokes[i];
    const hand = getHand(stroke.expected);
    if (hand === "neither") continue;

    const delay = i > 0 ? stroke.timestamp - keyStrokes[i - 1].timestamp : 0;

    if (hand === "left") {
      leftTotal++;
      if (!stroke.correct) leftErrors++;
      if (delay > 0 && delay < 5000) leftDelays.push(delay);
    } else {
      rightTotal++;
      if (!stroke.correct) rightErrors++;
      if (delay > 0 && delay < 5000) rightDelays.push(delay);
    }
  }

  return {
    left: {
      errors: leftErrors,
      total: leftTotal,
      errorRate: leftTotal > 0 ? Math.round((leftErrors / leftTotal) * 100) : 0,
      avgDelay: leftDelays.length > 0 ? Math.round(leftDelays.reduce((a, b) => a + b, 0) / leftDelays.length) : 0,
    },
    right: {
      errors: rightErrors,
      total: rightTotal,
      errorRate: rightTotal > 0 ? Math.round((rightErrors / rightTotal) * 100) : 0,
      avgDelay: rightDelays.length > 0 ? Math.round(rightDelays.reduce((a, b) => a + b, 0) / rightDelays.length) : 0,
    },
  };
}

export function computeBigramTimings(keyStrokes: KeyStroke[]): BigramTiming[] {
  const bigramDelays: Record<string, number[]> = {};

  for (let i = 0; i < keyStrokes.length - 1; i++) {
    const curr = keyStrokes[i];
    const next = keyStrokes[i + 1];
    if (!curr.correct || !next.correct) continue;

    const delay = curr.keyUpTimestamp
      ? next.timestamp - curr.keyUpTimestamp
      : next.timestamp - curr.timestamp;

    if (delay <= 0 || delay > 5000) continue;

    const bigram = `${curr.expected}${next.expected}`;
    if (!bigramDelays[bigram]) bigramDelays[bigram] = [];
    bigramDelays[bigram].push(delay);
  }

  return Object.entries(bigramDelays)
    .filter(([, delays]) => delays.length >= 2)
    .map(([bigram, delays]) => ({
      bigram,
      avgDelay: Math.round(delays.reduce((a, b) => a + b, 0) / delays.length),
      occurrences: delays.length,
    }))
    .sort((a, b) => b.avgDelay - a.avgDelay)
    .slice(0, 20);
}

export function computeConsistencyScore(keyStrokes: KeyStroke[]): number {
  const delays: number[] = [];
  for (let i = 1; i < keyStrokes.length; i++) {
    const delay = keyStrokes[i].timestamp - keyStrokes[i - 1].timestamp;
    if (delay > 0 && delay < 5000) delays.push(delay);
  }
  if (delays.length < 2) return 0;

  const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
  const variance = delays.reduce((sum, d) => sum + (d - mean) ** 2, 0) / delays.length;
  return Math.round(Math.sqrt(variance));
}

export function computeFatigueRatio(keyStrokes: KeyStroke[]): number {
  if (keyStrokes.length < 8) return 1.0;

  const quarterSize = Math.floor(keyStrokes.length / 4);
  const q1Strokes = keyStrokes.slice(0, quarterSize);
  const q4Strokes = keyStrokes.slice(-quarterSize);

  const avgDelay = (strokes: KeyStroke[]) => {
    const delays: number[] = [];
    for (let i = 1; i < strokes.length; i++) {
      const d = strokes[i].timestamp - strokes[i - 1].timestamp;
      if (d > 0 && d < 5000) delays.push(d);
    }
    return delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;
  };

  const q1Avg = avgDelay(q1Strokes);
  const q4Avg = avgDelay(q4Strokes);

  if (q1Avg === 0) return 1.0;
  return Math.round((q4Avg / q1Avg) * 100) / 100;
}

export function computeSessionTimingMetadata(keyStrokes: KeyStroke[]): SessionTimingMetadata {
  const holdDurations = keyStrokes
    .filter((k) => k.holdDuration !== undefined && k.holdDuration > 0)
    .map((k) => k.holdDuration!);

  const interKeyDelays = keyStrokes
    .filter((k) => k.interKeyDelay !== undefined && k.interKeyDelay > 0 && k.interKeyDelay < 5000)
    .map((k) => k.interKeyDelay!);

  const avgHoldDuration = holdDurations.length > 0
    ? Math.round(holdDurations.reduce((a, b) => a + b, 0) / holdDurations.length)
    : 0;

  const avgInterKeyDelay = interKeyDelays.length > 0
    ? Math.round(interKeyDelays.reduce((a, b) => a + b, 0) / interKeyDelays.length)
    : 0;

  const shortPresses = holdDurations.filter((d) => d < 30).length;

  const handStats = computeHandStats(keyStrokes);

  return {
    avgHoldDuration,
    avgInterKeyDelay,
    slowestBigrams: computeBigramTimings(keyStrokes),
    shortPresses,
    consistencyScore: computeConsistencyScore(keyStrokes),
    fatigueRatio: computeFatigueRatio(keyStrokes),
    leftHand: handStats.left,
    rightHand: handStats.right,
  };
}

export function computeRollingAverage(
  sessions: EnrichedSessionSummary[],
  windowDays: number,
  field: "wpm" | "accuracy"
): { date: string; value: number }[] {
  if (sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const results: { date: string; value: number }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const currentDate = new Date(sorted[i].date);
    const windowStart = new Date(currentDate);
    windowStart.setDate(windowStart.getDate() - windowDays);

    const windowSessions = sorted.filter((s) => {
      const d = new Date(s.date);
      return d >= windowStart && d <= currentDate;
    });

    const avg = windowSessions.reduce((sum, s) => sum + s[field], 0) / windowSessions.length;
    results.push({ date: sorted[i].date, value: Math.round(avg) });
  }

  return results;
}

export function computeImprovementRate(sessions: EnrichedSessionSummary[]): { week: string; wpmGain: number }[] {
  if (sessions.length < 2) return [];

  const byWeek: Record<string, number[]> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const week = weekStart.toISOString().split("T")[0];
    if (!byWeek[week]) byWeek[week] = [];
    byWeek[week].push(s.wpm);
  }

  const weeks = Object.keys(byWeek).sort();
  const results: { week: string; wpmGain: number }[] = [];

  for (let i = 1; i < weeks.length; i++) {
    const prevAvg = byWeek[weeks[i - 1]].reduce((a, b) => a + b, 0) / byWeek[weeks[i - 1]].length;
    const currAvg = byWeek[weeks[i]].reduce((a, b) => a + b, 0) / byWeek[weeks[i]].length;
    results.push({ week: weeks[i], wpmGain: Math.round(currAvg - prevAvg) });
  }

  return results;
}

export function findPersonalRecords(sessions: EnrichedSessionSummary[]): { date: string; type: "wpm" | "accuracy"; value: number }[] {
  const sorted = [...sessions].sort((a, b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));
  const records: { date: string; type: "wpm" | "accuracy"; value: number }[] = [];
  let maxWpm = 0;
  let maxAccuracy = 0;

  for (const s of sorted) {
    if (s.wpm > maxWpm) {
      maxWpm = s.wpm;
      records.push({ date: s.date, type: "wpm", value: s.wpm });
    }
    if (s.accuracy > maxAccuracy) {
      maxAccuracy = s.accuracy;
      records.push({ date: s.date, type: "accuracy", value: s.accuracy });
    }
  }

  return records;
}

export function bucketByTimeOfDay(sessions: EnrichedSessionSummary[]): { hour: number; avgWpm: number; count: number }[] {
  const byHour: Record<number, { wpms: number[]; count: number }> = {};

  for (const s of sessions) {
    const hour = s.timestamp ? new Date(s.timestamp).getHours() : 12;
    if (!byHour[hour]) byHour[hour] = { wpms: [], count: 0 };
    byHour[hour].wpms.push(s.wpm);
    byHour[hour].count++;
  }

  return Object.entries(byHour)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgWpm: Math.round(data.wpms.reduce((a, b) => a + b, 0) / data.wpms.length),
      count: data.count,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export function updatePracticeTargets(
  errorHeatmap: Record<string, number>,
  timingMetadata: SessionTimingMetadata | undefined,
  patterns: ErrorPattern[]
): PracticeTargets {
  const charSet = new Set<string>();
  const bigramSet = new Set<string>();

  // Top 10 chars from cumulative error heatmap
  const heatmapEntries = Object.entries(errorHeatmap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  for (const [char] of heatmapEntries) {
    if (char.length === 1) charSet.add(char);
  }

  // Chars from pattern detection (shallow activation, slipped finger, repeated-char)
  for (const p of patterns) {
    if (p.type === "shallow-activation" || p.type === "slipped-finger" || p.type === "repeated-char") {
      for (const c of p.chars) {
        if (c.length === 1) charSet.add(c);
      }
    }
  }

  // Bigrams from timing — those > 2x average
  if (timingMetadata && timingMetadata.avgInterKeyDelay > 0) {
    const threshold = timingMetadata.avgInterKeyDelay * 2;
    for (const b of timingMetadata.slowestBigrams) {
      if (b.avgDelay > threshold && b.bigram.length === 2) {
        bigramSet.add(b.bigram);
      }
    }
  }

  // Bigrams from slow-bigrams pattern
  for (const p of patterns) {
    if (p.type === "slow-bigrams") {
      for (const c of p.chars) {
        if (c.length === 2) bigramSet.add(c);
      }
    }
  }

  return {
    chars: [...charSet].slice(0, 15),
    bigrams: [...bigramSet].slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
}
