"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKeyboard, faBook, faSignal } from "@fortawesome/free-solid-svg-icons";
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

const DIFFICULTIES: Passage["difficulty"][] = ["beginner", "intermediate", "advanced"];

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
  const difficultyIndex = DIFFICULTIES.indexOf(passageDifficulty);

  const cycleDifficulty = () => {
    const next = (difficultyIndex + 1) % DIFFICULTIES.length;
    onDifficultyChange(DIFFICULTIES[next]);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Mode Toggle */}
      <div className="flex gap-1">
        <button
          onClick={() => onModeChange("drill")}
          className={`p-2.5 rounded-lg transition-all ${
            mode === "drill"
              ? "text-indigo-500 bg-indigo-500/10"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          title="Key Drill"
        >
          <FontAwesomeIcon icon={faKeyboard} className="w-5 h-5" />
        </button>
        <button
          onClick={() => onModeChange("passage")}
          className={`p-2.5 rounded-lg transition-all ${
            mode === "passage"
              ? "text-indigo-500 bg-indigo-500/10"
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
          title="Passages"
        >
          <FontAwesomeIcon icon={faBook} className="w-5 h-5" />
        </button>
      </div>

      {/* Difficulty — signal bar style, cycles on click */}
      <button
        onClick={cycleDifficulty}
        className="flex items-end gap-0.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
        title={`Difficulty: ${passageDifficulty} (click to cycle)`}
      >
        <span
          className={`w-2 rounded-sm transition-colors ${
            difficultyIndex >= 0 ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          style={{ height: "10px" }}
        />
        <span
          className={`w-2 rounded-sm transition-colors ${
            difficultyIndex >= 1 ? "bg-amber-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          style={{ height: "16px" }}
        />
        <span
          className={`w-2 rounded-sm transition-colors ${
            difficultyIndex >= 2 ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600"
          }`}
          style={{ height: "22px" }}
        />
      </button>

      {/* Drill level or category selector */}
      {mode === "drill" && (
        <div className="flex flex-wrap gap-1">
          {(["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"] as DrillLevel[]).map((level) => (
            <button
              key={level}
              onClick={() => onDrillLevelChange(level)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                drillLevel === level
                  ? "text-indigo-500 bg-indigo-500/10 font-medium"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {level.replace("-", " ")}
            </button>
          ))}
        </div>
      )}

      {mode === "passage" && (
        <div className="flex flex-wrap gap-1">
          {(["all", "book", "movie", "code"] as (Passage["category"] | "all")[]).map((c) => (
            <button
              key={c}
              onClick={() => onCategoryChange(c)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                passageCategory === c
                  ? "text-indigo-500 bg-indigo-500/10 font-medium"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
