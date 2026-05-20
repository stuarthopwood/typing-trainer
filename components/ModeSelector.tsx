"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKeyboard, faBook, faLock } from "@fortawesome/free-solid-svg-icons";
import type { TrainingMode, DrillLevel, Passage } from "@/lib/types";
import GlowBorder from "./GlowBorder";

interface ModeSelectorProps {
  mode: TrainingMode;
  drillLevel: DrillLevel;
  passageDifficulty: Passage["difficulty"];
  passageCategory: Passage["category"] | "all";
  unlockedDrillLevels: Set<string>;
  unlockedDifficulties: Set<string>;
  drillProgress: Record<string, number>;
  difficultyProgress: Record<string, number>;
  unlockThreshold: number;
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
  unlockedDrillLevels,
  unlockedDifficulties,
  drillProgress,
  difficultyProgress,
  unlockThreshold,
  onModeChange,
  onDrillLevelChange,
  onDifficultyChange,
  onCategoryChange,
}: ModeSelectorProps) {
  const difficultyIndex = DIFFICULTIES.indexOf(passageDifficulty);

  const cycleDifficulty = () => {
    for (let i = 1; i <= DIFFICULTIES.length; i++) {
      const next = (difficultyIndex + i) % DIFFICULTIES.length;
      if (unlockedDifficulties.has(DIFFICULTIES[next])) {
        onDifficultyChange(DIFFICULTIES[next]);
        return;
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Mode Toggle */}
      <div className="flex gap-1">
        <GlowBorder radius="0.5rem" intensity="subtle">
          <button
            onClick={() => onModeChange("drill")}
            className={`p-2.5 rounded-lg transition-all ${
              mode === "drill"
                ? "text-[#00ff88] bg-[#00ff88]/10"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
            aria-pressed={mode === "drill"}
            aria-label="Key Drill mode"
          >
            <FontAwesomeIcon icon={faKeyboard} className="w-5 h-5" />
          </button>
        </GlowBorder>
        <GlowBorder radius="0.5rem" intensity="subtle">
          <button
            onClick={() => onModeChange("passage")}
            className={`p-2.5 rounded-lg transition-all ${
              mode === "passage"
                ? "text-[#00ff88] bg-[#00ff88]/10"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
            aria-pressed={mode === "passage"}
            aria-label="Passage mode"
          >
            <FontAwesomeIcon icon={faBook} className="w-5 h-5" />
          </button>
        </GlowBorder>
      </div>

      {/* Difficulty — signal bar style, cycles on click */}
      <div className="flex items-center gap-2">
        <button
          onClick={cycleDifficulty}
          className="flex items-end gap-0.5 p-2 rounded-lg hover:bg-neutral-800 transition-all"
          title={`Difficulty: ${passageDifficulty} (click to cycle unlocked levels)`}
        >
          <span
            className={`w-2 rounded-sm transition-colors ${
              difficultyIndex >= 0 ? "bg-green-500" : "bg-neutral-700"
            }`}
            style={{ height: "10px" }}
          />
          <span
            className={`w-2 rounded-sm transition-colors ${
              difficultyIndex >= 1 && unlockedDifficulties.has("intermediate") ? "bg-amber-500" : "bg-neutral-700"
            }`}
            style={{ height: "16px" }}
          />
          <span
            className={`w-2 rounded-sm transition-colors ${
              difficultyIndex >= 2 && unlockedDifficulties.has("advanced") ? "bg-red-500" : "bg-neutral-700"
            }`}
            style={{ height: "22px" }}
          />
        </button>
        {mode === "passage" && !unlockedDifficulties.has(DIFFICULTIES[difficultyIndex + 1]) && difficultyIndex < 2 && (
          <span className="text-xs text-neutral-600">
            {difficultyProgress[passageDifficulty] ?? 0}/{unlockThreshold}
          </span>
        )}
      </div>

      {/* Drill level or category selector */}
      {mode === "drill" && (
        <div className="flex flex-wrap gap-1">
          {(["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"] as DrillLevel[]).map((level) => {
            const unlocked = unlockedDrillLevels.has(level);
            const progress = drillProgress[level] ?? 0;
            return (
              <GlowBorder key={level} radius="0.375rem" intensity="subtle">
                <button
                  onClick={() => unlocked && onDrillLevelChange(level)}
                  disabled={!unlocked}
                  aria-disabled={!unlocked}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1 ${
                    !unlocked
                      ? "text-neutral-700 cursor-not-allowed"
                      : drillLevel === level
                        ? "text-[#00ff88] bg-[#00ff88]/10 font-medium"
                        : "text-neutral-500 hover:text-neutral-300"
                  }`}
                  title={!unlocked ? `Locked — ${progress}/${unlockThreshold} qualifying sessions (85%+ accuracy)` : level.replace("-", " ")}
                >
                  {!unlocked && <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />}
                  {level.replace("-", " ")}
                  {!unlocked && <span className="text-xs text-neutral-600">{progress}/{unlockThreshold}</span>}
                </button>
              </GlowBorder>
            );
          })}
        </div>
      )}

      {mode === "passage" && (
        <div className="flex flex-wrap gap-1">
          {(["all", "book", "movie", "code", "quote"] as (Passage["category"] | "all")[]).map((c) => (
            <GlowBorder key={c} radius="0.375rem" intensity="subtle">
              <button
                onClick={() => onCategoryChange(c)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  passageCategory === c
                    ? "text-[#00ff88] bg-[#00ff88]/10 font-medium"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {c}
              </button>
            </GlowBorder>
          ))}
        </div>
      )}
    </div>
  );
}
