import type { BadgeDefinition, BadgeProgress } from "./types";

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "caveman", name: "Caveman", subtitle: "You discovered fire... and the keyboard", level: 1,
    layers: [{ icon: "faMountain", color: "var(--accent-dim)" }, { icon: "faFire", transform: "shrink-6 down-3", color: "#f97316" }],
  },
  {
    id: "hunt-and-pecker", name: "Hunt & Pecker", subtitle: "At least you found the keys", level: 2,
    layers: [{ icon: "faHandPointer", color: "var(--accent)" }, { icon: "faKeyboard", transform: "shrink-8 down-4", color: "#94a3b8" }],
  },
  {
    id: "thumb-warrior", name: "Thumb Warrior", subtitle: "Your phone misses you", level: 3,
    layers: [{ icon: "faMobileScreen", color: "#60a5fa" }, { icon: "faFaceSadTear", transform: "shrink-8 up-1", color: "#fbbf24" }],
  },
  {
    id: "keyboard-adjacent", name: "Keyboard Adjacent", subtitle: "Technically touching it", level: 4,
    layers: [{ icon: "faKeyboard", color: "#94a3b8" }, { icon: "faHand", transform: "shrink-6 up-4", color: "var(--accent)" }],
  },
  {
    id: "qwerty-apprentice", name: "QWERTY Apprentice", subtitle: "The letters aren't random?!", level: 5,
    layers: [{ icon: "faCircle", color: "var(--accent-dim)", opacity: 0.3 }, { icon: "faFont", transform: "shrink-6", color: "var(--accent)" }],
  },
  {
    id: "home-row-homie", name: "Home Row Homie", subtitle: "ASDF is life", level: 6,
    layers: [{ icon: "faHouse", color: "var(--accent)" }, { icon: "faKeyboard", transform: "shrink-8 down-2", color: "#e2e8f0" }],
  },
  {
    id: "shift-whisperer", name: "Shift Whisperer", subtitle: "Capitals on purpose now", level: 7,
    layers: [{ icon: "faArrowUp", color: "var(--accent)" }, { icon: "faA", transform: "shrink-8", color: "#e2e8f0" }],
  },
  {
    id: "typo-tamer", name: "Typo Tamer", subtitle: "Only 40% gibberish", level: 8,
    layers: [{ icon: "faCircleNotch", color: "var(--accent)" }, { icon: "faTextSlash", transform: "shrink-6", color: "#f87171" }],
  },
  {
    id: "word-slinger", name: "Word Slinger", subtitle: "Backspace usage down 50%", level: 9,
    layers: [{ icon: "faHatWizard", color: "#a78bfa" }, { icon: "faDeleteLeft", transform: "shrink-8 down-4", color: "#f87171", opacity: 0.5 }],
  },
  {
    id: "velocity-demon", name: "Velocity Demon", subtitle: "Your keyboard is warm", level: 10,
    layers: [{ icon: "faKeyboard", color: "#94a3b8" }, { icon: "faFireFlameCurved", transform: "shrink-4 up-4", color: "#f97316" }],
  },
  {
    id: "neural-linker", name: "Neural Linker", subtitle: "Fingers think for themselves", level: 11,
    layers: [{ icon: "faBrain", color: "#f472b6" }, { icon: "faBolt", transform: "shrink-6 right-4", color: "#fbbf24" }],
  },
  {
    id: "ghost-typist", name: "Ghost Typist", subtitle: "They can't see your hands move", level: 12,
    layers: [{ icon: "faGhost", color: "var(--accent)" }, { icon: "faKeyboard", transform: "shrink-8 down-3", color: "#94a3b8", opacity: 0.4 }],
  },
  {
    id: "digital-samurai", name: "Digital Samurai", subtitle: "Every keystroke intentional", level: 13,
    layers: [{ icon: "faShieldHalved", color: "#60a5fa" }, { icon: "faTerminal", transform: "shrink-8", color: "var(--accent)" }],
  },
  {
    id: "transcendent", name: "Transcendent", subtitle: "You ARE the keyboard", level: 14,
    layers: [{ icon: "faCircle", color: "var(--accent)", opacity: 0.2 }, { icon: "faPersonRays", transform: "shrink-4", color: "var(--accent)" }],
  },
  {
    id: "elder-being", name: "Elder Being", subtitle: "Skippy would be... mildly impressed", level: 15,
    layers: [{ icon: "faBeerMugEmpty", color: "#fbbf24" }, { icon: "faCrown", transform: "shrink-6 up-5", color: "#f97316" }, { icon: "faSparkles", transform: "shrink-10 right-5 up-2", color: "var(--accent)" }],
  },
];

export function getBadgeForLevel(level: number): BadgeDefinition | null {
  return BADGE_DEFINITIONS.find((b) => b.level === level) ?? null;
}

export function getCurrentBadge(level: number): BadgeDefinition {
  for (let i = BADGE_DEFINITIONS.length - 1; i >= 0; i--) {
    if (BADGE_DEFINITIONS[i].level <= level) return BADGE_DEFINITIONS[i];
  }
  return BADGE_DEFINITIONS[0];
}

export function checkBadgeUnlocks(oldLevel: number, newLevel: number, existing: BadgeProgress[]): BadgeDefinition[] {
  if (newLevel <= oldLevel) return [];
  const earnedIds = new Set(existing.map((b) => b.id));
  return BADGE_DEFINITIONS.filter((b) => b.level > oldLevel && b.level <= newLevel && !earnedIds.has(b.id));
}

export function migrateBadges(currentLevel: number, existing?: BadgeProgress[]): BadgeProgress[] {
  if (existing && existing.length > 0) return existing;
  const now = new Date().toISOString();
  return BADGE_DEFINITIONS
    .filter((b) => b.level <= currentLevel)
    .map((b) => ({ id: b.id, unlockedAt: now }));
}
