import type { KeyStroke, EnrichedSessionSummary } from "./types";

export interface BurstSpeed {
  sustained: number;
  burst: number;
  gap: number;
}

export interface ColdStartPenalty {
  coldWpm: number;
  warmWpm: number;
  penalty: number;
}

export interface RecoveryStats {
  avgRecoveryMs: number;
  count: number;
}

export interface TimeOfDayBucket {
  label: string;
  hour: number;
  sessions: number;
  avgWpm: number;
  avgAccuracy: number;
}

export interface FingerAccuracy {
  finger: string;
  accuracy: number;
  total: number;
  correct: number;
}

export function computeBurstSpeed(keyStrokes: KeyStroke[]): BurstSpeed {
  if (keyStrokes.length < 10) return { sustained: 0, burst: 0, gap: 0 };

  const duration = keyStrokes[keyStrokes.length - 1].timestamp - keyStrokes[0].timestamp;
  const sustained = duration > 0 ? Math.round((keyStrokes.filter((k) => k.correct).length / 5) / (duration / 60000)) : 0;

  let maxCharsInWindow = 0;
  const windowMs = 5000;

  for (let i = 0; i < keyStrokes.length; i++) {
    const windowStart = keyStrokes[i].timestamp;
    let charsInWindow = 0;
    for (let j = i; j < keyStrokes.length && keyStrokes[j].timestamp - windowStart <= windowMs; j++) {
      if (keyStrokes[j].correct) charsInWindow++;
    }
    if (charsInWindow > maxCharsInWindow) maxCharsInWindow = charsInWindow;
  }

  const burst = Math.round((maxCharsInWindow / 5) / (windowMs / 60000));
  return { sustained, burst, gap: burst - sustained };
}

export function computeColdStartPenalty(keyStrokes: KeyStroke[]): ColdStartPenalty {
  if (keyStrokes.length < 20) return { coldWpm: 0, warmWpm: 0, penalty: 0 };

  const startTime = keyStrokes[0].timestamp;
  const coldCutoff = startTime + 10000;

  const coldStrokes = keyStrokes.filter((k) => k.timestamp <= coldCutoff);
  const warmStrokes = keyStrokes.filter((k) => k.timestamp > coldCutoff);

  if (coldStrokes.length < 5 || warmStrokes.length < 5) return { coldWpm: 0, warmWpm: 0, penalty: 0 };

  const coldDuration = coldStrokes[coldStrokes.length - 1].timestamp - coldStrokes[0].timestamp;
  const warmDuration = warmStrokes[warmStrokes.length - 1].timestamp - warmStrokes[0].timestamp;

  const coldCorrect = coldStrokes.filter((k) => k.correct).length;
  const warmCorrect = warmStrokes.filter((k) => k.correct).length;

  const coldWpm = coldDuration > 0 ? Math.round((coldCorrect / 5) / (coldDuration / 60000)) : 0;
  const warmWpm = warmDuration > 0 ? Math.round((warmCorrect / 5) / (warmDuration / 60000)) : 0;

  return { coldWpm, warmWpm, penalty: warmWpm - coldWpm };
}

export function computeRecoveryTime(keyStrokes: KeyStroke[]): RecoveryStats {
  let totalRecovery = 0;
  let count = 0;

  for (let i = 0; i < keyStrokes.length - 1; i++) {
    if (!keyStrokes[i].correct) {
      for (let j = i + 1; j < keyStrokes.length; j++) {
        if (keyStrokes[j].correct) {
          totalRecovery += keyStrokes[j].timestamp - keyStrokes[i].timestamp;
          count++;
          break;
        }
      }
    }
  }

  return { avgRecoveryMs: count > 0 ? Math.round(totalRecovery / count) : 0, count };
}

export function computeTimeOfDay(sessions: EnrichedSessionSummary[]): TimeOfDayBucket[] {
  const buckets: Record<string, { label: string; hour: number; wpms: number[]; accs: number[] }> = {
    morning: { label: "Morning (6-12)", hour: 9, wpms: [], accs: [] },
    afternoon: { label: "Afternoon (12-18)", hour: 15, wpms: [], accs: [] },
    evening: { label: "Evening (18-22)", hour: 20, wpms: [], accs: [] },
    night: { label: "Night (22-6)", hour: 2, wpms: [], accs: [] },
  };

  for (const s of sessions) {
    const hour = new Date(s.timestamp || s.date).getHours();
    let bucket: string;
    if (hour >= 6 && hour < 12) bucket = "morning";
    else if (hour >= 12 && hour < 18) bucket = "afternoon";
    else if (hour >= 18 && hour < 22) bucket = "evening";
    else bucket = "night";

    buckets[bucket].wpms.push(s.wpm);
    buckets[bucket].accs.push(s.accuracy);
  }

  return Object.values(buckets)
    .filter((b) => b.wpms.length > 0)
    .map((b) => ({
      label: b.label,
      hour: b.hour,
      sessions: b.wpms.length,
      avgWpm: Math.round(b.wpms.reduce((a, c) => a + c, 0) / b.wpms.length),
      avgAccuracy: Math.round(b.accs.reduce((a, c) => a + c, 0) / b.accs.length),
    }));
}

const FINGER_MAP: Record<string, string> = {
  q: "L Pinky", a: "L Pinky", z: "L Pinky", "1": "L Pinky",
  w: "L Ring", s: "L Ring", x: "L Ring", "2": "L Ring",
  e: "L Middle", d: "L Middle", c: "L Middle", "3": "L Middle",
  r: "L Index", f: "L Index", v: "L Index", t: "L Index", g: "L Index", b: "L Index", "4": "L Index", "5": "L Index",
  y: "R Index", h: "R Index", n: "R Index", u: "R Index", j: "R Index", m: "R Index", "6": "R Index", "7": "R Index",
  i: "R Middle", k: "R Middle", ",": "R Middle", "8": "R Middle",
  o: "R Ring", l: "R Ring", ".": "R Ring", "9": "R Ring",
  p: "R Pinky", ";": "R Pinky", "/": "R Pinky", "0": "R Pinky", "'": "R Pinky",
  " ": "Thumbs",
};

export function computeFingerAccuracy(keyStrokes: KeyStroke[]): FingerAccuracy[] {
  const fingers: Record<string, { total: number; correct: number }> = {};

  for (const k of keyStrokes) {
    const finger = FINGER_MAP[k.expected.toLowerCase()] || "Other";
    if (!fingers[finger]) fingers[finger] = { total: 0, correct: 0 };
    fingers[finger].total++;
    if (k.correct) fingers[finger].correct++;
  }

  return Object.entries(fingers)
    .filter(([name]) => name !== "Other")
    .map(([finger, data]) => ({
      finger,
      accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 100,
      total: data.total,
      correct: data.correct,
    }))
    .sort((a, b) => {
      const order = ["L Pinky", "L Ring", "L Middle", "L Index", "Thumbs", "R Index", "R Middle", "R Ring", "R Pinky"];
      return order.indexOf(a.finger) - order.indexOf(b.finger);
    });
}

export function computeWpmSparkline(sessions: EnrichedSessionSummary[], count = 30): number[] {
  return sessions
    .slice(0, count)
    .reverse()
    .map((s) => s.wpm);
}
