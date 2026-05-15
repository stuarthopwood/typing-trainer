import { describe, it, expect } from "vitest";
import { getLevelFromXp, checkAchievements, ACHIEVEMENTS, LEVEL_THRESHOLDS } from "@/lib/achievements";
import type { AchievementContext } from "@/lib/achievements";

describe("Achievements — getLevelFromXp", () => {
  it("should return level 1 at 0 XP", () => {
    const result = getLevelFromXp(0);
    expect(result.level).toBe(1);
    expect(result.currentXp).toBe(0);
    expect(result.nextLevelXp).toBe(50);
  });

  it("should return level 1 at 49 XP (just below threshold)", () => {
    const result = getLevelFromXp(49);
    expect(result.level).toBe(1);
    expect(result.currentXp).toBe(49);
    expect(result.nextLevelXp).toBe(50);
  });

  it("should return level 2 at exactly 50 XP", () => {
    const result = getLevelFromXp(50);
    expect(result.level).toBe(2);
    expect(result.currentXp).toBe(0);
    expect(result.nextLevelXp).toBe(70); // 120 - 50
  });

  it("should return level 2 at 100 XP (between thresholds)", () => {
    const result = getLevelFromXp(100);
    expect(result.level).toBe(2);
    expect(result.currentXp).toBe(50); // 100 - 50
    expect(result.nextLevelXp).toBe(70); // 120 - 50
  });

  it("should return max level when XP exceeds all thresholds", () => {
    const maxXp = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 5000;
    const result = getLevelFromXp(maxXp);
    expect(result.level).toBe(LEVEL_THRESHOLDS.length);
  });

  it("should calculate currentXp correctly at max level", () => {
    const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    const result = getLevelFromXp(lastThreshold + 200);
    expect(result.currentXp).toBe(200);
    expect(result.nextLevelXp).toBe(1000); // beyond max: last + 1000 - last
  });
});

describe("Achievements — checkAchievements", () => {
  const emptyContext: AchievementContext = {
    totalSessions: 0,
    totalCharsTyped: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    sessionWpm: 0,
    sessionAccuracy: 0,
    levelProgress: {},
  };

  it("should return empty array when no conditions are met", () => {
    const result = checkAchievements(emptyContext, []);
    expect(result).toEqual([]);
  });

  it("should return empty array when achievement is already unlocked", () => {
    const context: AchievementContext = { ...emptyContext, totalSessions: 1 };
    const result = checkAchievements(context, ["first-blood"]);
    expect(result.find((a) => a.id === "first-blood")).toBeUndefined();
  });

  it("should return first-blood when totalSessions >= 1", () => {
    const context: AchievementContext = { ...emptyContext, totalSessions: 1 };
    const result = checkAchievements(context, []);
    expect(result.find((a) => a.id === "first-blood")).toBeDefined();
  });

  it("should handle multiple simultaneous unlocks", () => {
    const context: AchievementContext = {
      ...emptyContext,
      totalSessions: 10,
      bestWpm: 50,
      sessionAccuracy: 95,
      totalCharsTyped: 1000,
    };
    const result = checkAchievements(context, []);
    const ids = result.map((a) => a.id);
    expect(ids).toContain("first-blood");
    expect(ids).toContain("ten-sessions");
    expect(ids).toContain("speed-30");
    expect(ids).toContain("speed-50");
    expect(ids).toContain("accuracy-90");
    expect(ids).toContain("accuracy-95");
    expect(ids).toContain("chars-1k");
  });

  it("should not return achievements whose conditions are not met", () => {
    const context: AchievementContext = { ...emptyContext, totalSessions: 5 };
    const result = checkAchievements(context, []);
    const ids = result.map((a) => a.id);
    expect(ids).not.toContain("ten-sessions");
    expect(ids).not.toContain("century");
  });
});

describe("Achievements — Individual Conditions", () => {
  const baseContext: AchievementContext = {
    totalSessions: 0,
    totalCharsTyped: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    currentStreak: 0,
    bestStreak: 0,
    sessionWpm: 0,
    sessionAccuracy: 0,
    levelProgress: {},
  };

  it("first-blood triggers at exactly 1 session", () => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === "first-blood")!;
    expect(achievement.condition({ ...baseContext, totalSessions: 0 })).toBe(false);
    expect(achievement.condition({ ...baseContext, totalSessions: 1 })).toBe(true);
  });

  it("speed-30 triggers at exactly 30 WPM", () => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === "speed-30")!;
    expect(achievement.condition({ ...baseContext, bestWpm: 29 })).toBe(false);
    expect(achievement.condition({ ...baseContext, bestWpm: 30 })).toBe(true);
  });

  it("accuracy-100 triggers at exactly 100% session accuracy", () => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === "accuracy-100")!;
    expect(achievement.condition({ ...baseContext, sessionAccuracy: 99 })).toBe(false);
    expect(achievement.condition({ ...baseContext, sessionAccuracy: 100 })).toBe(true);
  });

  it("streak-7 triggers at exactly 7 day streak", () => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === "streak-7")!;
    expect(achievement.condition({ ...baseContext, currentStreak: 6 })).toBe(false);
    expect(achievement.condition({ ...baseContext, currentStreak: 7 })).toBe(true);
  });

  it("perfect-speed requires both 100% accuracy and 50+ WPM", () => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === "perfect-speed")!;
    expect(achievement.condition({ ...baseContext, sessionAccuracy: 100, sessionWpm: 49 })).toBe(false);
    expect(achievement.condition({ ...baseContext, sessionAccuracy: 99, sessionWpm: 50 })).toBe(false);
    expect(achievement.condition({ ...baseContext, sessionAccuracy: 100, sessionWpm: 50 })).toBe(true);
  });

  it("unlock-top triggers when home-row has 5 qualifying sessions", () => {
    const achievement = ACHIEVEMENTS.find((a) => a.id === "unlock-top")!;
    expect(achievement.condition({ ...baseContext, levelProgress: { "drill:home-row": 4 } })).toBe(false);
    expect(achievement.condition({ ...baseContext, levelProgress: { "drill:home-row": 5 } })).toBe(true);
  });
});
