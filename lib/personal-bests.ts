import type { EnrichedSessionSummary, KeyStroke } from "./types";

export interface PersonalBest {
  value: number;
  date: string;
  /** Source session id; optional because legacy sessions may lack one. */
  sessionId?: string;
}

export interface PersonalBests {
  fastestWpm: PersonalBest;
  highestAccuracy: PersonalBest;
  longestPerfectStreak: PersonalBest;
  longestSession: PersonalBest;
  mostSessionsInDay: { value: number; date: string };
}

export interface LifetimeStats {
  totalChars: number;
  totalSessions: number;
  totalTimeMs: number;
  totalErrors: number;
  daysPractised: number;
}

export interface FunEquivalence {
  label: string;
  value: string;
}

const EMPTY_PB: PersonalBest = { value: 0, date: "" };

export function emptyPersonalBests(): PersonalBests {
  return {
    fastestWpm: { ...EMPTY_PB },
    highestAccuracy: { ...EMPTY_PB },
    longestPerfectStreak: { ...EMPTY_PB },
    longestSession: { ...EMPTY_PB },
    mostSessionsInDay: { value: 0, date: "" },
  };
}

export function computePersonalBests(sessions: EnrichedSessionSummary[]): PersonalBests {
  const pbs = emptyPersonalBests();

  const dayCount: Record<string, number> = {};

  for (const s of sessions) {
    const date = (s.timestamp || s.date).slice(0, 10);

    if (s.wpm > pbs.fastestWpm.value) {
      pbs.fastestWpm = { value: s.wpm, date, sessionId: s.id };
    }
    if (s.accuracy > pbs.highestAccuracy.value) {
      pbs.highestAccuracy = { value: s.accuracy, date, sessionId: s.id };
    }
    if (s.duration > pbs.longestSession.value) {
      pbs.longestSession = { value: s.duration, date, sessionId: s.id };
    }

    dayCount[date] = (dayCount[date] || 0) + 1;
  }

  for (const [date, count] of Object.entries(dayCount)) {
    if (count > pbs.mostSessionsInDay.value) {
      pbs.mostSessionsInDay = { value: count, date };
    }
  }

  return pbs;
}

export function computeLongestPerfectStreak(keyStrokes: KeyStroke[]): number {
  let longest = 0;
  let current = 0;
  for (const k of keyStrokes) {
    if (k.correct) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

export function checkNewPersonalBest(
  current: PersonalBests,
  session: EnrichedSessionSummary,
  perfectStreak?: number
): { field: string; oldValue: number; newValue: number }[] {
  const broken: { field: string; oldValue: number; newValue: number }[] = [];
  const date = (session.timestamp || session.date).slice(0, 10);

  if (session.wpm > current.fastestWpm.value) {
    broken.push({ field: "Fastest WPM", oldValue: current.fastestWpm.value, newValue: session.wpm });
    current.fastestWpm = { value: session.wpm, date, sessionId: session.id };
  }
  if (session.accuracy > current.highestAccuracy.value) {
    broken.push({ field: "Highest Accuracy", oldValue: current.highestAccuracy.value, newValue: session.accuracy });
    current.highestAccuracy = { value: session.accuracy, date, sessionId: session.id };
  }
  if (session.duration > current.longestSession.value) {
    broken.push({ field: "Longest Session", oldValue: current.longestSession.value, newValue: session.duration });
    current.longestSession = { value: session.duration, date, sessionId: session.id };
  }
  if (perfectStreak !== undefined && perfectStreak > current.longestPerfectStreak.value) {
    broken.push({ field: "Perfect Streak", oldValue: current.longestPerfectStreak.value, newValue: perfectStreak });
    current.longestPerfectStreak = { value: perfectStreak, date, sessionId: session.id };
  }

  return broken;
}

export function computeLifetimeStats(sessions: EnrichedSessionSummary[]): LifetimeStats {
  const days = new Set<string>();
  let totalChars = 0;
  let totalTimeMs = 0;
  let totalErrors = 0;

  for (const s of sessions) {
    days.add((s.timestamp || s.date).slice(0, 10));
    totalChars += s.charsTyped;
    totalTimeMs += s.duration;
    const errorCount = Math.round(s.charsTyped * (1 - s.accuracy / 100));
    totalErrors += errorCount;
  }

  return {
    totalChars,
    totalSessions: sessions.length,
    totalTimeMs,
    totalErrors,
    daysPractised: days.size,
  };
}

export function computeFunEquivalences(stats: LifetimeStats): FunEquivalence[] {
  const equivalences: FunEquivalence[] = [];

  if (stats.totalChars > 0) {
    const novels = (stats.totalChars / 80000).toFixed(1);
    equivalences.push({ label: "novels typed", value: novels });
    const tweets = Math.floor(stats.totalChars / 280);
    equivalences.push({ label: "tweets worth", value: String(tweets) });
  }

  if (stats.totalTimeMs > 0) {
    const episodes = (stats.totalTimeMs / (22 * 60000)).toFixed(1);
    equivalences.push({ label: "Office episodes", value: episodes });
  }

  if (stats.totalErrors > 0 && stats.totalChars > 0) {
    const errorRate = stats.totalErrors / stats.totalChars;
    let verdict: string;
    if (errorRate < 0.02) verdict = "publishers would hire you";
    else if (errorRate < 0.05) verdict = "publishers would tolerate you";
    else if (errorRate < 0.1) verdict = "publishers would frown";
    else verdict = "publishers would weep";
    equivalences.push({ label: verdict, value: `${Math.round(errorRate * 80000)} typos/novel` });
  }

  return equivalences;
}
