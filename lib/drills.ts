import type { DrillConfig } from "./types";

export const DRILL_LEVELS: DrillConfig[] = [
  { level: "home-row", chars: "asdfghjkl;", label: "Home Row" },
  { level: "top-row", chars: "qwertyuiop", label: "Top Row" },
  { level: "bottom-row", chars: "zxcvbnm,.", label: "Bottom Row" },
  { level: "numbers", chars: "1234567890", label: "Numbers" },
  { level: "symbols", chars: "!@#$%^&*()-_=+[]{}|;:',.<>?/", label: "Symbols" },
  { level: "full", chars: "abcdefghijklmnopqrstuvwxyz0123456789", label: "Full Keyboard" },
];

export function generateDrillText(config: DrillConfig, length: number = 40): string {
  const chars = config.chars.split("");
  const words: string[] = [];
  let currentLength = 0;

  while (currentLength < length) {
    const wordLength = 3 + Math.floor(Math.random() * 4);
    let word = "";
    for (let i = 0; i < wordLength; i++) {
      word += chars[Math.floor(Math.random() * chars.length)];
    }
    words.push(word);
    currentLength += word.length + 1;
  }

  return words.join(" ");
}
