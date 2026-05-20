import type { SessionStats, EnrichedSessionSummary, SessionTimingMetadata, PracticeTargets } from "./types";

export interface ProgressData {
  totalSessions: number;
  totalCharsTyped: number;
  bestWpm: number;
  bestAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  lastSessionDate: string;
  recentSessions: EnrichedSessionSummary[];
  errorHeatmap: Record<string, number>;
  levelProgress: Record<string, number>;
  xp: number;
  achievements: { id: string; unlockedAt: string }[];
  tips: { text: string; explanation?: string; createdAt: string }[];
  practiceTargets?: PracticeTargets;
  drillLowAccuracyStreak?: Record<string, number>;
}

export interface SessionEnrichment {
  modeDetails: { type: "drill" | "passage"; level?: string; category?: string };
  timingMetadata?: SessionTimingMetadata;
}

const STORAGE_KEY = "typing-trainer-progress";

export function getProgress(): ProgressData {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return defaultProgress();
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultProgress();
  try {
    const data = JSON.parse(stored);
    if (!data || typeof data !== "object" || typeof data.totalSessions !== "number") {
      return defaultProgress();
    }
    if (!data.levelProgress) data.levelProgress = {};
    if (!data.xp) data.xp = 0;
    if (!data.achievements) data.achievements = [];
    if (!data.tips) data.tips = [];
    if (!data.drillLowAccuracyStreak) data.drillLowAccuracyStreak = {};
    return data;
  } catch {
    return defaultProgress();
  }
}

export function recordSession(stats: SessionStats, mode: string, enrichment?: SessionEnrichment): { progress: ProgressData; session: EnrichedSessionSummary } {
  const progress = getProgress();
  const now = new Date();
  const today = now.toISOString().split("T")[0];

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

  const session: EnrichedSessionSummary = {
    id: crypto.randomUUID(),
    timestamp: now.toISOString(),
    date: today,
    wpm: stats.wpm,
    accuracy: stats.accuracy,
    mode,
    duration: stats.duration,
    charsTyped: stats.totalChars,
    modeDetails: enrichment?.modeDetails ?? { type: mode.startsWith("drill") ? "drill" : "passage" },
    timingMetadata: enrichment?.timingMetadata,
  };

  progress.recentSessions = [session, ...progress.recentSessions].slice(0, 50);

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
  return { progress, session };
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
    xp: 0,
    achievements: [],
    tips: [],
    drillLowAccuracyStreak: {},
  };
}

const UNLOCK_THRESHOLD = 5;

export const DRILL_ORDER: string[] = ["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"];
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

export const DRILL_DEMOTE_ACCURACY_THRESHOLD = 70;
export const DRILL_DEMOTE_STREAK = 2;

export interface DemotionResult {
  demoted: boolean;
  fromLevel?: string;
  toLevel?: string;
}

export function processDrillDemotion(progress: ProgressData, accuracy: number, level: string): DemotionResult {
  if (!progress.drillLowAccuracyStreak) progress.drillLowAccuracyStreak = {};
  const idx = DRILL_ORDER.indexOf(level);
  if (idx <= 0) {
    progress.drillLowAccuracyStreak[level] = 0;
    return { demoted: false };
  }
  if (accuracy >= DRILL_DEMOTE_ACCURACY_THRESHOLD) {
    progress.drillLowAccuracyStreak[level] = 0;
    return { demoted: false };
  }
  const streak = (progress.drillLowAccuracyStreak[level] || 0) + 1;
  progress.drillLowAccuracyStreak[level] = streak;
  if (streak < DRILL_DEMOTE_STREAK) {
    return { demoted: false };
  }
  const prevLevel = DRILL_ORDER[idx - 1];
  progress.levelProgress[`drill:${prevLevel}`] = 0;
  progress.drillLowAccuracyStreak[level] = 0;
  return { demoted: true, fromLevel: level, toLevel: prevLevel };
}

export function getHighestUnlockedDrillLevel(): string {
  const unlocked = getUnlockedDrillLevels();
  for (let i = DRILL_ORDER.length - 1; i >= 0; i--) {
    if (unlocked.has(DRILL_ORDER[i])) return DRILL_ORDER[i];
  }
  return "home-row";
}

export function getUserPin(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("neuralkeys-pin");
}

export function setUserPin(pin: string): void {
  localStorage.setItem("neuralkeys-pin", pin);
}

export function clearUserPin(): void {
  localStorage.removeItem("neuralkeys-pin");
}

export type SyncStatus =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "network" | "http"; status?: number };

export async function syncToRemote(progress: ProgressData, newSession?: EnrichedSessionSummary): Promise<SyncStatus> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const pin = getUserPin();
  if (!apiKey || !pin) return { ok: false, reason: "not-configured" };
  try {
    const payload = newSession
      ? { ...progress, newSession }
      : progress;
    const res = await fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "x-user-pin": pin },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, reason: "http", status: res.status };
    return { ok: true };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export async function loadFromRemote(): Promise<ProgressData | null> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const pin = getUserPin();
  if (!apiKey || !pin) return null;
  try {
    const res = await fetch("/api/progress", {
      headers: { "x-api-key": apiKey, "x-user-pin": pin },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.totalSessions) return null;
    if (!data.levelProgress) data.levelProgress = {};
    if (!data.xp) data.xp = 0;
    if (!data.achievements) data.achievements = [];
    return data as ProgressData;
  } catch {
    return null;
  }
}

export async function loadFullHistory(): Promise<EnrichedSessionSummary[]> {
  const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const pin = getUserPin();
  if (!apiKey || !pin) return getProgress().recentSessions;
  try {
    const res = await fetch(`/api/progress?full=true`, {
      headers: { "x-api-key": apiKey, "x-user-pin": pin },
    });
    if (!res.ok) return getProgress().recentSessions;
    const data = await res.json();
    if (data?.allSessions && Array.isArray(data.allSessions)) {
      return data.allSessions;
    }
    return data?.recentSessions || getProgress().recentSessions;
  } catch {
    return getProgress().recentSessions;
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
    xp: Math.max(local.xp || 0, remote.xp || 0),
    achievements: mergeAchievements(local.achievements || [], remote.achievements || []),
    tips: mergeTips(local.tips || [], remote.tips || []),
    drillLowAccuracyStreak: { ...(remote.drillLowAccuracyStreak || {}), ...(local.drillLowAccuracyStreak || {}) },
  };
}

function mergeRecentSessions(a: EnrichedSessionSummary[], b: EnrichedSessionSummary[]): EnrichedSessionSummary[] {
  const seen = new Set<string>();
  const merged: EnrichedSessionSummary[] = [];
  for (const s of [...a, ...b]) {
    const key = s.id || `${s.date}:${s.mode}:${s.wpm}:${s.accuracy}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged.sort((x, y) => (y.timestamp || y.date).localeCompare(x.timestamp || x.date)).slice(0, 50);
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

function mergeTips(a: { text: string; explanation?: string; createdAt: string }[], b: { text: string; explanation?: string; createdAt: string }[]): { text: string; explanation?: string; createdAt: string }[] {
  const seen = new Set<string>();
  const merged: { text: string; explanation?: string; createdAt: string }[] = [];
  for (const t of [...a, ...b]) {
    if (!seen.has(t.text)) {
      seen.add(t.text);
      merged.push(t);
    }
  }
  return merged.sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 20);
}

function mergeAchievements(a: { id: string; unlockedAt: string }[], b: { id: string; unlockedAt: string }[]): { id: string; unlockedAt: string }[] {
  const map = new Map<string, string>();
  for (const ach of [...a, ...b]) {
    const existing = map.get(ach.id);
    if (!existing || ach.unlockedAt < existing) {
      map.set(ach.id, ach.unlockedAt);
    }
  }
  return Array.from(map.entries()).map(([id, unlockedAt]) => ({ id, unlockedAt }));
}
