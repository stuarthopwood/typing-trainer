export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  condition: (stats: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalSessions: number;
  totalCharsTyped: number;
  bestWpm: number;
  bestAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  sessionWpm: number;
  sessionAccuracy: number;
  levelProgress: Record<string, number>;
}

export interface UnlockedAchievement {
  id: string;
  unlockedAt: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Session milestones
  { id: "first-blood", name: "First Blood", description: "Complete your first session", icon: "⚔️", xp: 10, condition: (c) => c.totalSessions >= 1 },
  { id: "ten-sessions", name: "Getting Warmed Up", description: "Complete 10 sessions", icon: "🔥", xp: 25, condition: (c) => c.totalSessions >= 10 },
  { id: "fifty-sessions", name: "Dedicated", description: "Complete 50 sessions", icon: "💪", xp: 50, condition: (c) => c.totalSessions >= 50 },
  { id: "century", name: "Century", description: "Complete 100 sessions", icon: "💯", xp: 100, condition: (c) => c.totalSessions >= 100 },
  { id: "marathon", name: "Marathon Runner", description: "Complete 500 sessions", icon: "🏃", xp: 250, condition: (c) => c.totalSessions >= 500 },

  // Speed achievements
  { id: "speed-30", name: "Finding Your Rhythm", description: "Reach 30 WPM", icon: "🐢", xp: 15, condition: (c) => c.bestWpm >= 30 },
  { id: "speed-50", name: "Cruising Speed", description: "Reach 50 WPM", icon: "🚗", xp: 30, condition: (c) => c.bestWpm >= 50 },
  { id: "speed-70", name: "Velocity", description: "Reach 70 WPM", icon: "🚀", xp: 50, condition: (c) => c.bestWpm >= 70 },
  { id: "speed-100", name: "Triple Digits", description: "Reach 100 WPM", icon: "⚡", xp: 100, condition: (c) => c.bestWpm >= 100 },
  { id: "speed-130", name: "Hyperdrive", description: "Reach 130 WPM", icon: "🌀", xp: 200, condition: (c) => c.bestWpm >= 130 },

  // Accuracy achievements
  { id: "accuracy-90", name: "Sharp Shooter", description: "Achieve 90% accuracy in a session", icon: "🎯", xp: 15, condition: (c) => c.sessionAccuracy >= 90 },
  { id: "accuracy-95", name: "Surgeon's Precision", description: "Achieve 95% accuracy in a session", icon: "🔬", xp: 25, condition: (c) => c.sessionAccuracy >= 95 },
  { id: "accuracy-100", name: "Flawless", description: "Achieve 100% accuracy in a session", icon: "💎", xp: 50, condition: (c) => c.sessionAccuracy >= 100 },
  { id: "perfect-speed", name: "Perfect Storm", description: "100% accuracy at 50+ WPM", icon: "🌩️", xp: 100, condition: (c) => c.sessionAccuracy >= 100 && c.sessionWpm >= 50 },

  // Streak achievements
  { id: "streak-3", name: "Hat Trick", description: "3-day practice streak", icon: "🎩", xp: 20, condition: (c) => c.currentStreak >= 3 },
  { id: "streak-7", name: "Week Warrior", description: "7-day practice streak", icon: "📅", xp: 50, condition: (c) => c.currentStreak >= 7 },
  { id: "streak-30", name: "Monthly Master", description: "30-day practice streak", icon: "🏆", xp: 150, condition: (c) => c.currentStreak >= 30 },
  { id: "streak-100", name: "Unstoppable", description: "100-day practice streak", icon: "👑", xp: 500, condition: (c) => c.currentStreak >= 100 },

  // Characters typed
  { id: "chars-1k", name: "Wordsmith", description: "Type 1,000 characters total", icon: "✍️", xp: 10, condition: (c) => c.totalCharsTyped >= 1000 },
  { id: "chars-10k", name: "Novelist", description: "Type 10,000 characters total", icon: "📖", xp: 30, condition: (c) => c.totalCharsTyped >= 10000 },
  { id: "chars-50k", name: "NaNoWriMo", description: "Type 50,000 characters total", icon: "📚", xp: 75, condition: (c) => c.totalCharsTyped >= 50000 },
  { id: "chars-100k", name: "Prolific", description: "Type 100,000 characters total", icon: "🖋️", xp: 150, condition: (c) => c.totalCharsTyped >= 100000 },

  // Level progression
  { id: "unlock-top", name: "Reaching Higher", description: "Unlock the top row", icon: "⬆️", xp: 25, condition: (c) => (c.levelProgress["drill:home-row"] || 0) >= 5 },
  { id: "unlock-bottom", name: "Going Deep", description: "Unlock the bottom row", icon: "⬇️", xp: 25, condition: (c) => (c.levelProgress["drill:top-row"] || 0) >= 5 },
  { id: "unlock-numbers", name: "By The Numbers", description: "Unlock numbers", icon: "🔢", xp: 30, condition: (c) => (c.levelProgress["drill:bottom-row"] || 0) >= 5 },
  { id: "unlock-symbols", name: "Symbolic", description: "Unlock symbols", icon: "🔣", xp: 40, condition: (c) => (c.levelProgress["drill:numbers"] || 0) >= 5 },
  { id: "unlock-full", name: "Full Keyboard Mastery", description: "Unlock full keyboard", icon: "⌨️", xp: 50, condition: (c) => (c.levelProgress["drill:symbols"] || 0) >= 5 },
];

// XP thresholds for levels (RPG-style exponential curve)
export const LEVEL_THRESHOLDS: number[] = [
  0, 50, 120, 210, 330, 480, 670, 900, 1180, 1520,
  1920, 2400, 2960, 3620, 4400, 5300, 6350, 7550, 8950, 10500,
];

export function getLevelFromXp(xp: number): { level: number; currentXp: number; nextLevelXp: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1000;
  return {
    level,
    currentXp: xp - currentThreshold,
    nextLevelXp: nextThreshold - currentThreshold,
  };
}

export function checkAchievements(context: AchievementContext, alreadyUnlocked: string[]): Achievement[] {
  const unlockedSet = new Set(alreadyUnlocked);
  return ACHIEVEMENTS.filter((a) => !unlockedSet.has(a.id) && a.condition(context));
}
