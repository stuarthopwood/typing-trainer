export interface NemesisRecord {
  key: string;
  defeatedAt: string;
  finalAccuracy: number;
  daysAsNemesis: number;
}

export interface NemesisData {
  currentKey: string | null;
  accuracy: number;
  attempts: number;
  since: string;
  history: NemesisRecord[];
}

const MIN_ATTEMPTS = 10;
const DEFEAT_THRESHOLD = 85;

export function computeNemesis(errorHeatmap: Record<string, number>, totalByKey?: Record<string, number>): { key: string; accuracy: number; attempts: number } | null {
  if (!totalByKey) return computeNemesisFromHeatmap(errorHeatmap);

  let worstKey: string | null = null;
  let worstAccuracy = 100;
  let worstAttempts = 0;

  for (const [key, total] of Object.entries(totalByKey)) {
    if (total < MIN_ATTEMPTS) continue;
    const errors = errorHeatmap[key] || 0;
    const accuracy = Math.round(((total - errors) / total) * 100);
    if (accuracy < worstAccuracy) {
      worstKey = key;
      worstAccuracy = accuracy;
      worstAttempts = total;
    }
  }

  if (!worstKey) return null;
  return { key: worstKey, accuracy: worstAccuracy, attempts: worstAttempts };
}

function computeNemesisFromHeatmap(errorHeatmap: Record<string, number>): { key: string; accuracy: number; attempts: number } | null {
  const entries = Object.entries(errorHeatmap).filter(([, errors]) => errors >= 3);
  if (entries.length === 0) return null;

  entries.sort((a, b) => b[1] - a[1]);
  const [key, errors] = entries[0];
  const estimatedAttempts = errors * 5;
  const accuracy = Math.round(((estimatedAttempts - errors) / estimatedAttempts) * 100);

  return { key, accuracy, attempts: estimatedAttempts };
}

export function isNemesisDefeated(accuracy: number): boolean {
  return accuracy >= DEFEAT_THRESHOLD;
}

export function updateNemesisData(
  current: NemesisData,
  newNemesis: { key: string; accuracy: number; attempts: number } | null
): NemesisData {
  if (!newNemesis) {
    return { ...current, currentKey: null, accuracy: 100, attempts: 0 };
  }

  if (current.currentKey && current.currentKey !== newNemesis.key) {
    const daysAsNemesis = current.since
      ? Math.max(1, Math.round((Date.now() - new Date(current.since).getTime()) / 86400000))
      : 1;

    const record: NemesisRecord = {
      key: current.currentKey,
      defeatedAt: new Date().toISOString(),
      finalAccuracy: current.accuracy,
      daysAsNemesis,
    };

    return {
      currentKey: newNemesis.key,
      accuracy: newNemesis.accuracy,
      attempts: newNemesis.attempts,
      since: new Date().toISOString(),
      history: [record, ...current.history].slice(0, 10),
    };
  }

  return {
    ...current,
    currentKey: newNemesis.key,
    accuracy: newNemesis.accuracy,
    attempts: newNemesis.attempts,
    since: current.since || new Date().toISOString(),
  };
}

export function emptyNemesisData(): NemesisData {
  return { currentKey: null, accuracy: 0, attempts: 0, since: "", history: [] };
}
