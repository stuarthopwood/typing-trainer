"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartBar, faKeyboard } from "@fortawesome/free-solid-svg-icons";
import TypingArea from "@/components/TypingArea";
import StatsDisplay from "@/components/StatsDisplay";
import ModeSelector from "@/components/ModeSelector";
import VisualKeyboard from "@/components/VisualKeyboard";
import { buildSessionStats, calculateWpm, calculateAccuracy } from "@/lib/engine";
import { generateDrillText, DRILL_LEVELS } from "@/lib/drills";
import { getRandomPassage } from "@/lib/passages";
import { recordSession } from "@/lib/progress";
import type { TrainingMode, DrillLevel, KeyStroke, SessionStats, Passage, ActiveKeyState } from "@/lib/types";

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
  const [activeKey, setActiveKey] = useState<ActiveKeyState | null>(null);
  const [position, setPosition] = useState(0);
  const activeKeyTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const currentText = useMemo(() => {
    if (mode === "drill") {
      const config = DRILL_LEVELS.find((l) => l.level === drillLevel) || DRILL_LEVELS[0];
      return generateDrillText(config);
    }
    const cat = passageCategory === "all" ? undefined : passageCategory;
    return getRandomPassage(passageDifficulty, cat).text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, drillLevel, passageDifficulty, passageCategory, textKey]);

  const handleProgress = useCallback((pos: number, keyStrokes: KeyStroke[]) => {
    setPosition(pos);
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
    setPosition(0);
  }, []);

  const handleKeyPress = useCallback((key: string, code: string, correct: boolean | null) => {
    clearTimeout(activeKeyTimeoutRef.current);
    setActiveKey({ key, code, correct, timestamp: performance.now() });
    activeKeyTimeoutRef.current = setTimeout(() => setActiveKey(null), 150);
  }, []);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeKey?.code === e.code) {
        clearTimeout(activeKeyTimeoutRef.current);
        setActiveKey(null);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, [activeKey]);

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
          <h1 className="text-lg font-bold text-slate-800 dark:text-neutral-300 flex items-center gap-2">
            <FontAwesomeIcon icon={faKeyboard} className="w-5 h-5 text-[#00ff88]" />
            Typing Trainer
          </h1>
          <Link href="/stats" className="text-neutral-400 hover:text-[#00ff88] transition-colors" title="Stats">
            <FontAwesomeIcon icon={faChartBar} className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {position === 0 && !isActive && (
        <div className="w-full px-6 sm:px-10 pt-3 flex justify-end">
          <p className="text-sm text-slate-400 dark:text-slate-500">Start typing to begin...</p>
        </div>
      )}

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
          onKeyPress={handleKeyPress}
        />

        <VisualKeyboard
          activeKey={activeKey}
          nextExpectedKey={position < currentText.length ? currentText[position] : null}
        />

        {mode === "passage" && !sessionStats && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            {getRandomPassage(passageDifficulty, passageCategory === "all" ? undefined : passageCategory).source}
          </p>
        )}
      </div>
    </main>
  );
}
