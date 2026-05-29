import type { KeyStroke } from "./types";

export interface FingerLoad {
  finger: string;
  keystrokes: number;
  percentage: number;
  accuracy: number;
  avgDelay: number;
}

const FINGER_MAP: Record<string, string> = {
  q: "L Pinky", a: "L Pinky", z: "L Pinky", "1": "L Pinky",
  w: "L Ring", s: "L Ring", x: "L Ring", "2": "L Ring",
  e: "L Middle", d: "L Middle", c: "L Middle", "3": "L Middle",
  r: "L Index", f: "L Index", v: "L Index", t: "L Index", g: "L Index", b: "L Index", "4": "L Index", "5": "L Index",
  y: "R Index", h: "R Index", n: "R Index", u: "R Index", j: "R Index", m: "R Index", "6": "R Index", "7": "R Index",
  i: "R Middle", k: "R Middle", ",": "R Middle", "8": "R Middle",
  o: "R Ring", l: "R Ring", ".": "R Ring", "9": "R Ring",
  p: "R Pinky", ";": "R Pinky", "/": "R Pinky", "0": "R Pinky", "'": "R Pinky",
  " ": "Thumbs",
};

const FINGER_ORDER = ["L Pinky", "L Ring", "L Middle", "L Index", "Thumbs", "R Index", "R Middle", "R Ring", "R Pinky"];

export function computeFingerLoad(keyStrokes: KeyStroke[]): FingerLoad[] {
  const data: Record<string, { total: number; correct: number; delays: number[] }> = {};

  for (let i = 0; i < keyStrokes.length; i++) {
    const k = keyStrokes[i];
    const finger = FINGER_MAP[k.expected.toLowerCase()] || "Other";
    if (finger === "Other") continue;

    if (!data[finger]) data[finger] = { total: 0, correct: 0, delays: [] };
    data[finger].total++;
    if (k.correct) data[finger].correct++;
    if (k.interKeyDelay && k.interKeyDelay > 0 && k.interKeyDelay < 5000) {
      data[finger].delays.push(k.interKeyDelay);
    }
  }

  const totalKeystrokes = Object.values(data).reduce((s, d) => s + d.total, 0);

  return FINGER_ORDER
    .filter((f) => data[f])
    .map((finger) => {
      const d = data[finger];
      return {
        finger,
        keystrokes: d.total,
        percentage: totalKeystrokes > 0 ? Math.round((d.total / totalKeystrokes) * 100) : 0,
        accuracy: d.total > 0 ? Math.round((d.correct / d.total) * 100) : 100,
        avgDelay: d.delays.length > 0 ? Math.round(d.delays.reduce((a, b) => a + b, 0) / d.delays.length) : 0,
      };
    });
}

export function getOverloadedFingers(loads: FingerLoad[]): string[] {
  const avg = loads.reduce((s, l) => s + l.percentage, 0) / loads.length;
  return loads.filter((l) => l.percentage > avg * 1.5).map((l) => l.finger);
}

export function getWeakFingers(loads: FingerLoad[]): string[] {
  return loads.filter((l) => l.accuracy < 85 && l.keystrokes >= 10).map((l) => l.finger);
}
