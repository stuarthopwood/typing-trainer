import { describe, it, expect } from "vitest";
import { checkBadgeUnlocks, getBadgeForLevel, getCurrentBadge, migrateBadges, BADGE_DEFINITIONS } from "@/lib/badges";
import type { BadgeProgress } from "@/lib/types";

describe("Badges — checkBadgeUnlocks", () => {
  it("should return newly earned badges when level increases (US1.1)", () => {
    // Given a user at level 1 with no badges
    const existing: BadgeProgress[] = [{ id: "caveman", unlockedAt: "2026-01-01" }];

    // When they level up from 1 to 2
    const earned = checkBadgeUnlocks(1, 2, existing);

    // Then the level 2 badge is earned
    expect(earned).toHaveLength(1);
    expect(earned[0].id).toBe("hunt-and-pecker");
    expect(earned[0].level).toBe(2);
  });

  it("should return multiple badges when crossing multiple levels at once (US1 multi-level)", () => {
    // Given a user at level 1
    const existing: BadgeProgress[] = [{ id: "caveman", unlockedAt: "2026-01-01" }];

    // When they jump from level 1 to level 4
    const earned = checkBadgeUnlocks(1, 4, existing);

    // Then badges for levels 2, 3, and 4 are earned
    expect(earned).toHaveLength(3);
    expect(earned.map((b) => b.level)).toEqual([2, 3, 4]);
  });

  it("should not return already-earned badges (idempotency)", () => {
    // Given a user with badge for level 2 already earned
    const existing: BadgeProgress[] = [
      { id: "caveman", unlockedAt: "2026-01-01" },
      { id: "hunt-and-pecker", unlockedAt: "2026-01-02" },
    ];

    // When level stays at 2 or moves to 2 again
    const earned = checkBadgeUnlocks(1, 2, existing);

    // Then no duplicates
    expect(earned).toHaveLength(0);
  });

  it("should return empty array when level does not increase", () => {
    // Given any state
    const existing: BadgeProgress[] = [];

    // When old level >= new level
    const earned = checkBadgeUnlocks(3, 3, existing);

    // Then nothing earned
    expect(earned).toHaveLength(0);
  });

  it("should return empty array when level decreases", () => {
    const earned = checkBadgeUnlocks(5, 3, []);
    expect(earned).toHaveLength(0);
  });
});

describe("Badges — getBadgeForLevel", () => {
  it("should return the badge definition for a specific level", () => {
    const badge = getBadgeForLevel(5);
    expect(badge).not.toBeNull();
    expect(badge!.id).toBe("qwerty-apprentice");
    expect(badge!.name).toBe("QWERTY Apprentice");
  });

  it("should return null for a level with no badge", () => {
    const badge = getBadgeForLevel(99);
    expect(badge).toBeNull();
  });
});

describe("Badges — getCurrentBadge", () => {
  it("should return the highest badge at or below the given level", () => {
    const badge = getCurrentBadge(7);
    expect(badge.id).toBe("shift-whisperer");
    expect(badge.level).toBe(7);
  });

  it("should return level 1 badge for level 1", () => {
    const badge = getCurrentBadge(1);
    expect(badge.id).toBe("caveman");
  });

  it("should return level 15 badge for level 15+", () => {
    const badge = getCurrentBadge(20);
    expect(badge.id).toBe("elder-being");
  });
});

describe("Badges — migrateBadges", () => {
  it("should retroactively award all badges up to current level", () => {
    // Given a user at level 5 with no badge data
    const badges = migrateBadges(5, undefined);

    // Then badges for levels 1-5 are awarded
    expect(badges).toHaveLength(5);
    expect(badges.map((b) => b.id)).toEqual([
      "caveman", "hunt-and-pecker", "thumb-warrior", "keyboard-adjacent", "qwerty-apprentice",
    ]);
    expect(badges[0].unlockedAt).toBeTruthy();
  });

  it("should return existing badges if already populated", () => {
    const existing: BadgeProgress[] = [{ id: "caveman", unlockedAt: "2026-01-01" }];
    const result = migrateBadges(5, existing);
    expect(result).toBe(existing);
  });

  it("should return empty array for level 0", () => {
    const badges = migrateBadges(0, undefined);
    expect(badges).toHaveLength(0);
  });
});

describe("Badges — BADGE_DEFINITIONS", () => {
  it("should have exactly 15 badges", () => {
    expect(BADGE_DEFINITIONS).toHaveLength(15);
  });

  it("should have unique IDs", () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(15);
  });

  it("should have sequential levels 1-15", () => {
    const levels = BADGE_DEFINITIONS.map((b) => b.level);
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("should have at least one icon layer per badge", () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.layers.length).toBeGreaterThanOrEqual(1);
    }
  });
});
