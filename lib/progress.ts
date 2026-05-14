import type { SessionStats } from "./types";

export interface ProgressData {
  totalSessions: number;
  totalCharsTyped: number;
  bestWpm: number;
  bestAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string;
  recentSessions: SessionSummary[];
  errorHeatmap: Record<string, number>;
}

interface SessionSummary {
  date: string;
  wpm: number;
  accuracy: number;
  mode: string;
}

const STORAGE_KEY = "typing-trainer-progress";

export function getProgress(): ProgressData {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return defaultProgress();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultProgress();
  return JSON.parse(stored);
}

export function recordSession(stats: SessionStats, mode: string): ProgressData {
  const progress = getProgress();
  const today = new Date().toISOString().split("T")[0];

  progress.totalSessions += 1;
  progress.totalCharsTyped += stats.totalChars;

  if (stats.wpm > progress.bestWpm) progress.bestWpm = stats.wpm;
  if (stats.accuracy > progress.bestAccuracy) progress.bestAccuracy = stats.accuracy;

  if (progress.lastSessionDate === today) {
    // same day, streak continues
  } else if (progress.lastSessionDate === yesterday()) {
    progress.currentStreak += 1;
  } else if (progress.lastSessionDate !== today) {
    progress.currentStreak = 1;
  }

  if (progress.currentStreak > progress.bestStreak) {
    progress.bestStreak = progress.currentStreak;
  }

  progress.lastSessionDate = today;

  progress.recentSessions = [
    { date: today, wpm: stats.wpm, accuracy: stats.accuracy, mode },
    ...progress.recentSessions,
  ].slice(0, 20);

  for (const stroke of stats.keyStrokes) {
    if (!stroke.correct) {
      progress.errorHeatmap[stroke.expected] = (progress.errorHeatmap[stroke.expected] || 0) + 1;
    }
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }
  return progress;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function defaultProgress(): ProgressData {
  return {
    totalSessions: 0,
    totalCharsTyped: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSessionDate: "",
    recentSessions: [],
    errorHeatmap: {},
  };
}
