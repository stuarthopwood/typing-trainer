import type { DrillConfig } from "./types";

export const DRILL_LEVELS: DrillConfig[] = [
  { level: "home-row", chars: "asdfghjkl;", label: "Home Row" },
  { level: "top-row", chars: "qwertyuiop", label: "Top Row" },
  { level: "bottom-row", chars: "zxcvbnm,.", label: "Bottom Row" },
  { level: "numbers", chars: "1234567890", label: "Numbers" },
  { level: "symbols", chars: "!@#$%^&*()-_=+[]{}|;:',.<>?/", label: "Symbols" },
  { level: "full", chars: "abcdefghijklmnopqrstuvwxyz0123456789", label: "Full Keyboard" },
];

const WORD_BANK: Record<string, string[]> = {
  "home-row": [
    "flash", "salad", "flask", "shall", "falls", "glass", "slash", "flags",
    "dads", "lads", "adds", "fads", "jags", "gash", "dash", "hash",
    "glad", "half", "hall", "alfa", "saga", "lake", "fake", "sake",
    "jade", "fade", "shade", "asked", "salsa", "shall", "flask",
  ],
  "top-row": [
    "quote", "write", "tower", "power", "query", "route", "outer", "trout",
    "type", "wipe", "ripe", "pipe", "wire", "tire", "your", "tour", "pour",
    "riot", "pity", "quit", "whip", "trip", "equip", "quite", "white",
    "poetry", "equity", "proper", "trophy", "report", "import", "export",
  ],
  "bottom-row": [
    "comb", "bomb", "zinc", "zone", "mix", "fix", "box", "van", "ban", "can",
    "cab", "numb", "dumb", "lamb", "climb", "crumb", "thumb", "plumb",
    "maze", "blaze", "craze", "glaze", "amaze", "frozen", "blazing",
    "boxing", "foxing", "vexing", "moving", "giving", "living", "making",
  ],
  "numbers": [
    "1st", "2nd", "3rd", "4th", "5th", "10x", "24/7", "365", "100",
    "2024", "2025", "2026", "404", "500", "200", "128", "256", "512",
    "3.14", "9.81", "42", "007", "1984", "2001", "99", "101", "1000",
  ],
  "symbols": [
    "user@email.com", "price: $9.99", "50% off!", "yes/no", "(hello)",
    "[array]", "{object}", "key=value", "a && b", "x || y", "!done",
    "path/to/file", "name: 'Stuart'", "count++", "i--", "a += b",
  ],
  "full": [
    "keyboard", "practice", "rhythm", "quickly", "jumping", "foxes",
    "wizard", "boxing", "sphinx", "quartz", "velocity", "oxygen",
    "sequence", "frequent", "exquisite", "juxtapose", "magazine",
    "recognize", "emphasize", "technique", "mechanism", "algorithm",
    "developer", "typescript", "function", "variable", "parameter",
  ],
};

export function generateDrillText(config: DrillConfig, length: number = 50): string {
  const words = WORD_BANK[config.level] || WORD_BANK["full"];
  const selected: string[] = [];
  let currentLength = 0;

  while (currentLength < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    selected.push(word);
    currentLength += word.length + 1;
  }

  return selected.join(" ");
}
