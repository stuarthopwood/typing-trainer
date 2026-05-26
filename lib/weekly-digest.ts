import type { EnrichedSessionSummary } from "./types";

export interface WeeklyDigest {
  weekStart: string;
  weekEnd: string;
  sessions: number;
  totalTimeMs: number;
  avgWpm: number;
  avgAccuracy: number;
  bestWpm: number;
  improvement: number;
  daysPractised: number;
  insights: string[];
}

export function computeWeeklyDigest(sessions: EnrichedSessionSummary[], weekOffset = 0): WeeklyDigest | null {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() + mondayOffset - (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const startStr = weekStart.toISOString().slice(0, 10);
  const endStr = weekEnd.toISOString().slice(0, 10);

  const weekSessions = sessions.filter((s) => {
    const date = (s.timestamp || s.date).slice(0, 10);
    return date >= startStr && date <= endStr;
  });

  if (weekSessions.length === 0) return null;

  const totalTimeMs = weekSessions.reduce((s, ses) => s + ses.duration, 0);
  const avgWpm = Math.round(weekSessions.reduce((s, ses) => s + ses.wpm, 0) / weekSessions.length);
  const avgAccuracy = Math.round(weekSessions.reduce((s, ses) => s + ses.accuracy, 0) / weekSessions.length);
  const bestWpm = Math.max(...weekSessions.map((s) => s.wpm));
  const daysPractised = new Set(weekSessions.map((s) => (s.timestamp || s.date).slice(0, 10))).size;

  // Compare to previous week
  const prevDigest = weekOffset === 0 ? computeWeeklyDigest(sessions, 1) : null;
  const improvement = prevDigest ? avgWpm - prevDigest.avgWpm : 0;

  const insights: string[] = [];
  if (daysPractised >= 5) insights.push("Consistent practice this week — 5+ days!");
  else if (daysPractised <= 2) insights.push("Light week — try to practise more regularly.");
  if (improvement > 3) insights.push(`WPM up ${improvement} from last week — nice progress!`);
  else if (improvement < -3) insights.push(`WPM dipped ${Math.abs(improvement)} from last week — shake it off.`);
  if (bestWpm > avgWpm + 10) insights.push(`Burst of ${bestWpm} WPM — your potential is higher than your average.`);
  if (avgAccuracy >= 95) insights.push("Accuracy on point — 95%+ average this week.");

  return { weekStart: startStr, weekEnd: endStr, sessions: weekSessions.length, totalTimeMs, avgWpm, avgAccuracy, bestWpm, improvement, daysPractised, insights };
}

export function getRecentWeeklyDigests(sessions: EnrichedSessionSummary[], count = 4): WeeklyDigest[] {
  const digests: WeeklyDigest[] = [];
  for (let i = 0; i < count; i++) {
    const digest = computeWeeklyDigest(sessions, i);
    if (digest) digests.push(digest);
  }
  return digests;
}
