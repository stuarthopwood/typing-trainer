export type TrainingMode = "drill" | "passage";

export type DrillLevel =
  | "home-row"
  | "top-row"
  | "bottom-row"
  | "numbers"
  | "symbols"
  | "full";

export interface KeyStroke {
  expected: string;
  actual: string;
  timestamp: number;
  correct: boolean;
}

export interface SessionStats {
  wpm: number;
  accuracy: number;
  totalChars: number;
  correctChars: number;
  errors: number;
  duration: number;
  keyStrokes: KeyStroke[];
}

export interface Passage {
  id: string;
  text: string;
  source: string;
  category: "book" | "movie" | "code" | "quote";
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface DrillConfig {
  level: DrillLevel;
  chars: string;
  label: string;
}

export type CelebrationTier = "none" | "good" | "great" | "perfect";

export interface ActiveKeyState {
  key: string;
  code: string;
  correct: boolean | null;
  timestamp: number;
}
