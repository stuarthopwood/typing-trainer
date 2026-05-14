"use client";

import { useState, useCallback, useMemo } from "react";
import TypingArea from "@/components/TypingArea";
import StatsDisplay from "@/components/StatsDisplay";
import ModeSelector from "@/components/ModeSelector";
import { buildSessionStats, calculateWpm, calculateAccuracy } from "@/lib/engine";
import { generateDrillText, DRILL_LEVELS } from "@/lib/drills";
import { getRandomPassage } from "@/lib/passages";
import { recordSession } from "@/lib/progress";
import type { TrainingMode, DrillLevel, KeyStroke, SessionStats, Passage } from "@/lib/types";

export default function Home() {
  const [mode, setMode] = useState<TrainingMode>("passage");
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("home-row");
  const [passageDifficulty, setPassageDifficulty] = useState<Passage["difficulty"]>("beginner");
  const [passageCategory, setPassageCategory] = useState<Passage["category"] | "all">("all");
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const [isActive, setIsActive] = useState(false);
  const [textKey, setTextKey] = useState(0);

  const currentText = useMemo(() => {
    if (mode === "drill") {
      const config = DRILL_LEVELS.find((l) => l.level === drillLevel) || DRILL_LEVELS[0];
      return generateDrillText(config);
    }
    const cat = passageCategory === "all" ? undefined : passageCategory;
    return getRandomPassage(passageDifficulty, cat).text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, drillLevel, passageDifficulty, passageCategory, textKey]);

  const handleProgress = useCallback((position: number, keyStrokes: KeyStroke[]) => {
    if (keyStrokes.length < 2) {
      setIsActive(true);
      return;
    }
    const duration = keyStrokes[keyStrokes.length - 1].timestamp - keyStrokes[0].timestamp;
    const correct = keyStrokes.filter((k) => k.correct).length;
    setLiveWpm(calculateWpm(correct, duration));
    setLiveAccuracy(calculateAccuracy(correct, keyStrokes.length));
  }, []);

  const handleComplete = useCallback(
    (keyStrokes: KeyStroke[]) => {
      const stats = buildSessionStats(keyStrokes);
      setSessionStats(stats);
      setIsActive(false);
      recordSession(stats, mode === "drill" ? `drill:${drillLevel}` : "passage");
    },
    [mode, drillLevel]
  );

  const handleNext = () => {
    setSessionStats(null);
    setLiveWpm(0);
    setLiveAccuracy(100);
    setIsActive(false);
    setTextKey((k) => k + 1);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            ⌨️ Typing Trainer
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <ModeSelector
          mode={mode}
          drillLevel={drillLevel}
          passageDifficulty={passageDifficulty}
          passageCategory={passageCategory}
          onModeChange={(m) => { setMode(m); handleNext(); }}
          onDrillLevelChange={(l) => { setDrillLevel(l); handleNext(); }}
          onDifficultyChange={(d) => { setPassageDifficulty(d); handleNext(); }}
          onCategoryChange={(c) => { setPassageCategory(c); handleNext(); }}
        />

        <StatsDisplay
          stats={sessionStats}
          liveWpm={liveWpm}
          liveAccuracy={liveAccuracy}
          isActive={isActive}
        />

        <TypingArea
          text={currentText}
          onComplete={handleComplete}
          onProgress={handleProgress}
        />

        {sessionStats && (
          <div className="text-center">
            <button
              onClick={handleNext}
              className="px-8 py-3 text-lg font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
            >
              Next →
            </button>
          </div>
        )}

        {mode === "passage" && !sessionStats && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            {getRandomPassage(passageDifficulty, passageCategory === "all" ? undefined : passageCategory).source}
          </p>
        )}
      </div>
    </main>
  );
}
