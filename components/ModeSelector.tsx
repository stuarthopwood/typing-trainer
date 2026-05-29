"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKeyboard, faBook, faLock, faSpa, faRotate, faPaste, faCalendarDay } from "@fortawesome/free-solid-svg-icons";
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
  zenAvailable: boolean;
  zenTopic?: string;
  zenTopicLoading?: boolean;
  isDailyChallenge?: boolean;
  dailyCompleted?: boolean;
  onModeChange: (mode: TrainingMode) => void;
  onDrillLevelChange: (level: DrillLevel) => void;
  onDifficultyChange: (d: Passage["difficulty"]) => void;
  onCategoryChange: (c: Passage["category"] | "all") => void;
  onNewZenTopic?: () => void;
  onDailyChallenge?: () => void;
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
  zenAvailable,
  zenTopic,
  zenTopicLoading,
  onModeChange,
  onDrillLevelChange,
  onDifficultyChange,
  onCategoryChange,
  onNewZenTopic,
  isDailyChallenge,
  dailyCompleted,
  onDailyChallenge,
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
            className={`p-3 rounded-lg transition-all ${
              mode === "drill"
                ? "text-[#00ff88] bg-[#00ff88]/10"
                : "text-neutral-300 hover:text-white"
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
            className={`p-3 rounded-lg transition-all ${
              mode === "passage"
                ? "text-[#00ff88] bg-[#00ff88]/10"
                : "text-neutral-300 hover:text-white"
            }`}
            aria-pressed={mode === "passage"}
            aria-label="Passage mode"
          >
            <FontAwesomeIcon icon={faBook} className="w-5 h-5" />
          </button>
        </GlowBorder>
        {zenAvailable && (
          <GlowBorder radius="0.5rem" intensity="subtle">
            <button
              onClick={() => onModeChange("zen")}
              className={`p-3 rounded-lg transition-all ${
                mode === "zen"
                  ? "text-[#00ff88] bg-[#00ff88]/10"
                  : "text-neutral-300 hover:text-white"
              }`}
              aria-pressed={mode === "zen"}
              aria-label="Zen mode — free typing"
            >
              <FontAwesomeIcon icon={faSpa} className="w-5 h-5" />
            </button>
          </GlowBorder>
        )}
        <GlowBorder radius="0.5rem" intensity="subtle">
          <button
            onClick={onDailyChallenge}
            className={`p-3 rounded-lg transition-all relative ${
              isDailyChallenge
                ? "text-amber-400 bg-amber-400/10"
                : dailyCompleted
                  ? "text-[#00ff88]"
                  : "text-neutral-300 hover:text-white"
            }`}
            aria-pressed={isDailyChallenge}
            aria-label={dailyCompleted ? "Daily Challenge (completed)" : "Daily Challenge"}
            title={dailyCompleted ? "Daily Challenge — completed!" : "Daily Challenge"}
          >
            <FontAwesomeIcon icon={faCalendarDay} className="w-5 h-5" />
            {dailyCompleted && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#00ff88] rounded-full" aria-hidden="true" />}
          </button>
        </GlowBorder>
        <GlowBorder radius="0.5rem" intensity="subtle">
          <button
            onClick={() => onModeChange("custom")}
            className={`p-3 rounded-lg transition-all ${
              mode === "custom"
                ? "text-[#00ff88] bg-[#00ff88]/10"
                : "text-neutral-300 hover:text-white"
            }`}
            aria-pressed={mode === "custom"}
            aria-label="Custom text mode"
            title="Custom text — paste your own"
          >
            <FontAwesomeIcon icon={faPaste} className="w-5 h-5" />
          </button>
        </GlowBorder>
      </div>

      {mode === "zen" && (
        <div className="flex items-center gap-3">
          {zenTopicLoading ? (
            <p className="text-sm text-neutral-400 italic animate-pulse">Generating topic...</p>
          ) : zenTopic ? (
            <p id="zen-topic-prompt" className="text-sm text-neutral-200 italic">&ldquo;{zenTopic}&rdquo;</p>
          ) : null}
          {!zenTopicLoading && (
            <GlowBorder radius="0.375rem" intensity="subtle">
              <button
                onClick={onNewZenTopic}
                className="px-3 py-1.5 text-sm rounded-md transition-all text-neutral-300 hover:text-white flex items-center gap-1.5"
                aria-label="Generate a new topic (cancels current session)"
              >
                <FontAwesomeIcon icon={faRotate} className="w-3 h-3" />
                New Topic
              </button>
            </GlowBorder>
          )}
        </div>
      )}

      {isDailyChallenge && (
        <span className="text-xs text-amber-400 font-medium">Daily Challenge</span>
      )}

      {/* Difficulty — only meaningful in passage mode */}
      {mode === "passage" && !isDailyChallenge && (() => {
        const unlockedCount = DIFFICULTIES.filter((d) => unlockedDifficulties.has(d)).length;
        const canCycle = unlockedCount > 1;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={cycleDifficulty}
              disabled={!canCycle}
              className={`flex items-end gap-0.5 p-3 rounded-lg transition-all ${canCycle ? "hover:bg-neutral-800 cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
              title={canCycle ? `Difficulty: ${passageDifficulty} (click to cycle unlocked levels)` : `Difficulty: ${passageDifficulty} (unlock more by completing sessions at 85%+ accuracy)`}
              aria-label={`Difficulty level: ${passageDifficulty}${canCycle ? " — click to cycle" : " — locked"}`}
            >
              <span
                className={`w-2 rounded-sm transition-colors ${
                  difficultyIndex >= 0 ? "bg-green-500" : "bg-neutral-600"
                }`}
                style={{ height: "10px" }}
              />
              <span
                className={`w-2 rounded-sm transition-colors ${
                  difficultyIndex >= 1 && unlockedDifficulties.has("intermediate") ? "bg-amber-500" : "bg-neutral-600"
                }`}
                style={{ height: "16px" }}
              />
              <span
                className={`w-2 rounded-sm transition-colors ${
                  difficultyIndex >= 2 && unlockedDifficulties.has("advanced") ? "bg-red-500" : "bg-neutral-600"
                }`}
                style={{ height: "22px" }}
              />
            </button>
            <span className="text-xs text-neutral-200 capitalize font-medium">{passageDifficulty}</span>
            {!unlockedDifficulties.has(DIFFICULTIES[difficultyIndex + 1]) && difficultyIndex < 2 && (
              <span className="text-xs text-neutral-400">
                {difficultyProgress[passageDifficulty] ?? 0}/{unlockThreshold}
              </span>
            )}
          </div>
        );
      })()}

      {/* Drill level or category selector */}
      {mode === "drill" && (
        <div className="flex flex-wrap gap-1">
          {(["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"] as DrillLevel[]).map((level) => {
            const unlocked = unlockedDrillLevels.has(level);
            const progress = drillProgress[level] ?? 0;
            return (
              <GlowBorder key={level} radius="0.375rem" intensity="subtle" disabled={!unlocked}>
                <button
                  onClick={() => unlocked && onDrillLevelChange(level)}
                  disabled={!unlocked && drillLevel !== level}
                  className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1 ${
                    drillLevel === level
                      ? "text-[#00ff88] bg-[#00ff88]/10 font-medium"
                      : !unlocked
                        ? "text-neutral-400 cursor-not-allowed"
                        : "text-neutral-300 hover:text-white"
                  }`}
                  title={!unlocked ? `Locked — ${progress}/${unlockThreshold} qualifying sessions (85%+ accuracy)` : level.replace("-", " ")}
                >
                  {!unlocked && drillLevel !== level && <FontAwesomeIcon icon={faLock} className="w-2.5 h-2.5" />}
                  {level.replace("-", " ")}
                  {!unlocked && drillLevel !== level && <span className="text-xs text-neutral-400">{progress}/{unlockThreshold}</span>}
                </button>
              </GlowBorder>
            );
          })}
        </div>
      )}

      {mode === "passage" && !isDailyChallenge && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Passage category filter">
          {(["all", "book", "movie", "code", "quote"] as (Passage["category"] | "all")[]).map((c) => (
            <GlowBorder key={c} radius="0.375rem" intensity="subtle">
              <button
                onClick={() => onCategoryChange(c)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                  passageCategory === c
                    ? "text-[#00ff88] bg-[#00ff88]/10 font-medium"
                    : "text-neutral-300 hover:text-white"
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
