"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar } from "@fortawesome/free-solid-svg-icons";
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
  const [elapsed, setElapsed] = useState(0);
  const [combo, setCombo] = useState(0);
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
    setElapsed(duration);

    const last = keyStrokes[keyStrokes.length - 1];
    if (last.correct) {
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }
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

  const handleNext = useCallback(() => {
    setSessionStats(null);
    setLiveWpm(0);
    setLiveAccuracy(100);
    setIsActive(false);
    setElapsed(0);
    setCombo(0);
    setTextKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const handleEnterForNext = (e: KeyboardEvent) => {
      if (sessionStats && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleEnterForNext);
    return () => window.removeEventListener("keydown", handleEnterForNext);
  }, [sessionStats, handleNext]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0d0d0d] transition-colors">
      <header className="dark:bg-[#141414] border-b border-slate-200 dark:border-neutral-800/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="w-full px-6 sm:px-10 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800 dark:text-neutral-300">
            ⌨️ Typing Trainer
          </h1>
          <Link href="/stats" className="text-neutral-400 hover:text-[#00ff88] transition-colors" title="Stats">
            <FontAwesomeIcon icon={faChartBar} className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <div className="w-full px-6 sm:px-10 py-8 space-y-10">
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
          elapsed={elapsed}
          combo={combo}
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
              className="px-8 py-3 text-lg font-semibold text-black bg-[#00ff88] rounded-xl hover:bg-[#00cc6a] active:bg-[#009e54] transition-colors shadow-sm"
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
