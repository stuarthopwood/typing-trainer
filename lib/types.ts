export type TrainingMode = "drill" | "passage" | "zen";

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
  keyUpTimestamp?: number;
  holdDuration?: number;
  interKeyDelay?: number;
}

export interface BigramTiming {
  bigram: string;
  avgDelay: number;
  occurrences: number;
}

export interface HandStats {
  errors: number;
  total: number;
  errorRate: number;
  avgDelay: number;
}

export interface SessionTimingMetadata {
  avgHoldDuration: number;
  avgInterKeyDelay: number;
  slowestBigrams: BigramTiming[];
  shortPresses: number;
  consistencyScore: number;
  fatigueRatio: number;
  leftHand: HandStats;
  rightHand: HandStats;
}

export interface EnrichedSessionSummary {
  id: string;
  timestamp: string;
  date: string;
  wpm: number;
  accuracy: number;
  mode: string;
  duration: number;
  charsTyped: number;
  modeDetails: {
    type: "drill" | "passage" | "zen";
    level?: string;
    category?: string;
    topic?: string;
    wordCount?: number;
    misspelledWords?: string[];
  };
  timingMetadata?: SessionTimingMetadata;
}

export interface PracticeTargets {
  chars: string[];
  bigrams: string[];
  updatedAt: string;
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
