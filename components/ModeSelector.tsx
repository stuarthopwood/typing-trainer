"use client";

import type { TrainingMode, DrillLevel, Passage } from "@/lib/types";

interface ModeSelectorProps {
  mode: TrainingMode;
  drillLevel: DrillLevel;
  passageDifficulty: Passage["difficulty"];
  passageCategory: Passage["category"] | "all";
  onModeChange: (mode: TrainingMode) => void;
  onDrillLevelChange: (level: DrillLevel) => void;
  onDifficultyChange: (d: Passage["difficulty"]) => void;
  onCategoryChange: (c: Passage["category"] | "all") => void;
}

export default function ModeSelector({
  mode,
  drillLevel,
  passageDifficulty,
  passageCategory,
  onModeChange,
  onDrillLevelChange,
  onDifficultyChange,
  onCategoryChange,
}: ModeSelectorProps) {
  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <ModeButton active={mode === "drill"} onClick={() => onModeChange("drill")}>
          ⌨️ Key Drill
        </ModeButton>
        <ModeButton active={mode === "passage"} onClick={() => onModeChange("passage")}>
          📖 Passages
        </ModeButton>
      </div>

      {/* Mode-specific options */}
      {mode === "drill" && (
        <div className="flex flex-wrap gap-1.5">
          {(["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"] as DrillLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => onDrillLevelChange(level)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                drillLevel === level
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {level.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {mode === "passage" && (
        <div className="flex flex-wrap gap-1.5">
          {(["beginner", "intermediate", "advanced"] as Passage["difficulty"][]).map((d) => (
            <button
              key={d}
              onClick={() => onDifficultyChange(d)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                passageDifficulty === d
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {d}
            </button>
          ))}
          <span className="w-px h-6 self-center bg-slate-300 dark:bg-slate-600 mx-1" />
          {(["all", "book", "movie", "code", "quote"] as (Passage["category"] | "all")[]).map((c) => (
            <button
              key={c}
              onClick={() => onCategoryChange(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                passageCategory === c
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2.5 px-4 text-sm font-semibold rounded-xl transition-colors ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
