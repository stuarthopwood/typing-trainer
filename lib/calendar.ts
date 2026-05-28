import type { EnrichedSessionSummary } from "./types";

export interface CalendarDay {
  date: string;
  sessionCount: number;
  avgWpm: number;
  avgAccuracy: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActiveDate: string;
}

export function buildCalendarData(sessions: EnrichedSessionSummary[]): Map<string, CalendarDay> {
  const map = new Map<string, CalendarDay>();

  for (const s of sessions) {
    const date = (s.timestamp || s.date).slice(0, 10);
    const existing = map.get(date);
    if (existing) {
      const total = existing.sessionCount + 1;
      existing.avgWpm = Math.round((existing.avgWpm * existing.sessionCount + s.wpm) / total);
      existing.avgAccuracy = Math.round((existing.avgAccuracy * existing.sessionCount + s.accuracy) / total);
      existing.sessionCount = total;
    } else {
      map.set(date, { date, sessionCount: 1, avgWpm: s.wpm, avgAccuracy: s.accuracy });
    }
  }

  return map;
}

export function computeStreaks(sessions: EnrichedSessionSummary[]): StreakData {
  if (sessions.length === 0) return { current: 0, longest: 0, lastActiveDate: "" };

  const activeDays = new Set<string>();
  for (const s of sessions) {
    activeDays.add((s.timestamp || s.date).slice(0, 10));
  }

  const sortedDays = [...activeDays].sort();
  if (sortedDays.length === 0) return { current: 0, longest: 0, lastActiveDate: "" };

  let longest = 1;
  let streak = 1;

  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      streak = 1;
    }
  }

  // Current streak: count back from today
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let current = 0;
  let checkDate: string;

  if (activeDays.has(today)) {
    checkDate = today;
  } else if (activeDays.has(yesterday)) {
    checkDate = yesterday;
  } else {
    return { current: 0, longest, lastActiveDate: sortedDays[sortedDays.length - 1] };
  }

  while (activeDays.has(checkDate)) {
    current++;
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().slice(0, 10);
  }

  return { current, longest: Math.max(longest, current), lastActiveDate: sortedDays[sortedDays.length - 1] };
}

export function generateCalendarGrid(): string[][] {
  const weeks: string[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - dayOfWeek));

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (52 * 7) + 1);

  const current = new Date(startDate);
  let week: string[] = [];

  while (current <= endDate) {
    week.push(current.toISOString().slice(0, 10));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    current.setDate(current.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  return weeks;
}
