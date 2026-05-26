import type { KeyStroke } from "./types";

export interface GhostFrame {
  position: number;
  timestamp: number;
}

export interface GhostSession {
  id: string;
  text: string;
  wpm: number;
  accuracy: number;
  date: string;
  frames: GhostFrame[];
}

export function recordGhostFrames(keyStrokes: KeyStroke[]): GhostFrame[] {
  let position = 0;
  const frames: GhostFrame[] = [{ position: 0, timestamp: keyStrokes[0]?.timestamp ?? 0 }];

  for (const k of keyStrokes) {
    if (k.correct) {
      position++;
      frames.push({ position, timestamp: k.timestamp });
    }
  }

  return frames;
}

export function getGhostPosition(frames: GhostFrame[], elapsedMs: number): number {
  if (frames.length === 0) return 0;
  const startTime = frames[0].timestamp;
  const targetTime = startTime + elapsedMs;

  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].timestamp <= targetTime) return frames[i].position;
  }
  return 0;
}

const STORAGE_KEY = "neuralkeys-ghost-sessions";
const MAX_GHOSTS = 10;

export function saveGhostSession(ghost: GhostSession): void {
  if (typeof localStorage === "undefined") return;
  const existing = getGhostSessions();
  const updated = [ghost, ...existing.filter((g) => g.id !== ghost.id)].slice(0, MAX_GHOSTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getGhostSessions(): GhostSession[] {
  if (typeof localStorage === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

export function findBestGhostForText(text: string): GhostSession | null {
  const ghosts = getGhostSessions();
  const matching = ghosts.filter((g) => g.text === text);
  if (matching.length === 0) return null;
  return matching.reduce((best, g) => g.wpm > best.wpm ? g : best);
}

export function computeGhostLead(playerPosition: number, ghostPosition: number, totalChars: number): { ahead: boolean; chars: number; percentage: number } {
  const diff = playerPosition - ghostPosition;
  return {
    ahead: diff >= 0,
    chars: Math.abs(diff),
    percentage: totalChars > 0 ? Math.round((Math.abs(diff) / totalChars) * 100) : 0,
  };
}
