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
  levelProgress: Record<string, number>;
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
  const data = JSON.parse(stored);
  if (!data.levelProgress) data.levelProgress = {};
  return data;
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

  if (stats.accuracy >= 85) {
    progress.levelProgress[mode] = (progress.levelProgress[mode] || 0) + 1;
  }

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
    levelProgress: {},
  };
}

const UNLOCK_THRESHOLD = 5;

const DRILL_ORDER: string[] = ["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"];
const DIFFICULTY_ORDER: string[] = ["beginner", "intermediate", "advanced"];

export function getUnlockedDrillLevels(): Set<string> {
  const progress = getProgress();
  const unlocked = new Set<string>(["home-row"]);
  for (let i = 1; i < DRILL_ORDER.length; i++) {
    const prev = DRILL_ORDER[i - 1];
    const qualifying = progress.levelProgress[`drill:${prev}`] || 0;
    if (qualifying >= UNLOCK_THRESHOLD) {
      unlocked.add(DRILL_ORDER[i]);
    } else {
      break;
    }
  }
  return unlocked;
}

export function getUnlockedDifficulties(): Set<string> {
  const progress = getProgress();
  const unlocked = new Set<string>(["beginner"]);
  for (let i = 1; i < DIFFICULTY_ORDER.length; i++) {
    const prev = DIFFICULTY_ORDER[i - 1];
    const qualifying = progress.levelProgress[`passage:${prev}`] || 0;
    if (qualifying >= UNLOCK_THRESHOLD) {
      unlocked.add(DIFFICULTY_ORDER[i]);
    } else {
      break;
    }
  }
  return unlocked;
}

export function getLevelQualifyingSessions(mode: string): number {
  const progress = getProgress();
  return progress.levelProgress[mode] || 0;
}

export const UNLOCK_SESSIONS_REQUIRED = UNLOCK_THRESHOLD;

export async function syncToRemote(progress: ProgressData): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  if (!apiKey) return;
  try {
    await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(progress),
    });
  } catch {
    // Silent fail — local data is the source of truth, remote is backup
  }
}

export async function loadFromRemote(): Promise<ProgressData | null> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("/api/progress", {
      headers: { "x-api-key": apiKey },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.totalSessions) return null;
    if (!data.levelProgress) data.levelProgress = {};
    return data as ProgressData;
  } catch {
    return null;
  }
}

export function mergeProgress(local: ProgressData, remote: ProgressData): ProgressData {
  return {
    totalSessions: Math.max(local.totalSessions, remote.totalSessions),
    totalCharsTyped: Math.max(local.totalCharsTyped, remote.totalCharsTyped),
    bestWpm: Math.max(local.bestWpm, remote.bestWpm),
    bestAccuracy: Math.max(local.bestAccuracy, remote.bestAccuracy),
    currentStreak: Math.max(local.currentStreak, remote.currentStreak),
    bestStreak: Math.max(local.bestStreak, remote.bestStreak),
    lastSessionDate: local.lastSessionDate > remote.lastSessionDate ? local.lastSessionDate : remote.lastSessionDate,
    recentSessions: mergeRecentSessions(local.recentSessions, remote.recentSessions),
    errorHeatmap: mergeHeatmaps(local.errorHeatmap, remote.errorHeatmap),
    levelProgress: mergeLevelProgress(local.levelProgress, remote.levelProgress),
  };
}

function mergeRecentSessions(a: SessionSummary[], b: SessionSummary[]): SessionSummary[] {
  const seen = new Set<string>();
  const merged: SessionSummary[] = [];
  for (const s of [...a, ...b]) {
    const key = `${s.date}:${s.mode}:${s.wpm}:${s.accuracy}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 20);
}

function mergeHeatmaps(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const result = { ...a };
  for (const [k, v] of Object.entries(b)) {
    result[k] = Math.max(result[k] || 0, v);
  }
  return result;
}

function mergeLevelProgress(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const result = { ...a };
  for (const [k, v] of Object.entries(b)) {
    result[k] = Math.max(result[k] || 0, v);
  }
  return result;
}
