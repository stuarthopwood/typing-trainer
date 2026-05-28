"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faKeyboard, faVolumeHigh, faVolumeXmark, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import TypingArea from "@/components/TypingArea";
import GlowBorder from "@/components/GlowBorder";
import ModeSelector from "@/components/ModeSelector";
import VisualKeyboard from "@/components/VisualKeyboard";
import { buildSessionStats, calculateWpm, calculateAccuracy } from "@/lib/engine";
import { generateDrillText, DRILL_LEVELS, filterTargetsForLevel } from "@/lib/drills";
import { playKeyClick, playKeyError } from "@/lib/sounds";
import { checkAchievements, getLevelFromXp, type Achievement, type AchievementContext } from "@/lib/achievements";
import { getRandomPassage } from "@/lib/passages";
import { recordSession, getProgress, getUnlockedDrillLevels, getUnlockedDifficulties, getLevelQualifyingSessions, UNLOCK_SESSIONS_REQUIRED, syncToRemote, loadFromRemote, mergeProgress, getUserPin, setUserPin, clearUserPin, processDrillDemotion, getHighestUnlockedDrillLevel } from "@/lib/progress";
import PinEntry from "@/components/PinEntry";
import TipBox from "@/components/TipBox";
import ZenTypingArea from "@/components/ZenTypingArea";
import ZenResponsePanel from "@/components/ZenResponsePanel";
import { detectErrorPatterns, buildTipPrompt } from "@/lib/tips";
import { computeSessionTimingMetadata, updatePracticeTargets } from "@/lib/analytics";
import { fetchZenTopic, buildZenSessionStats, type SpellCheckResult } from "@/lib/zen";
import { checkBadgeUnlocks, getCurrentBadge } from "@/lib/badges";
import CustomTextInput from "@/components/CustomTextInput";
import { paginateText } from "@/lib/custom-text";
import BadgeToast from "@/components/BadgeToast";
import BadgeIcon from "@/components/BadgeIcon";
import type { TrainingMode, DrillLevel, KeyStroke, SessionStats, Passage, ActiveKeyState, PracticeTargets, BadgeDefinition } from "@/lib/types";

export default function Home() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setHasPin(!!getUserPin());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = useCallback(() => {
    clearUserPin();
    localStorage.removeItem("typing-trainer-progress");
    setHasPin(false);
  }, []);

  if (hasPin === null) return null;
  if (!hasPin) {
    return <PinEntry onSubmit={(pin) => { setUserPin(pin); setHasPin(true); }} />;
  }

  return <NeuralKeysApp onLogout={handleLogout} />;
}

function NeuralKeysApp({ onLogout }: { onLogout: () => void }) {
  const [mode, setMode] = useState<TrainingMode>("drill");
  const [drillLevel, setDrillLevel] = useState<DrillLevel>("home-row");
  const [demotionNotice, setDemotionNotice] = useState<{ from: string; to: string } | null>(null);
  const initialDrillLevelSetRef = useRef(false);
  const [passageDifficulty, setPassageDifficulty] = useState<Passage["difficulty"]>("beginner");
  const [passageCategory, setPassageCategory] = useState<Passage["category"] | "all">("all");
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [textKey, setTextKey] = useState(0);
  const [activeKey, setActiveKey] = useState<ActiveKeyState | null>(null);
  const [position, setPosition] = useState(0);
  const [unlockVersion, setUnlockVersion] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ wpm: number; accuracy: number }[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([]);
  const [newBadge, setNewBadge] = useState<BadgeDefinition | null>(null);
  const [currentTip, setCurrentTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const tipCooldownRef = useRef(false);
  const recentErrorsRef = useRef<KeyStroke[]>([]);
  const activeKeyTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const activeKeyRef = useRef<ActiveKeyState | null>(null);

  const [unlockedDrillLevels, setUnlockedDrillLevels] = useState<Set<string>>(new Set(["home-row"]));
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<Set<string>>(new Set(["beginner"]));
  const [drillProgress, setDrillProgress] = useState<Record<string, number>>({});
  const [difficultyProgress, setDifficultyProgress] = useState<Record<string, number>>({});
  const [xp, setXp] = useState(0);
  const [bestWpm, setBestWpm] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [practiceTargets, setPracticeTargets] = useState<PracticeTargets | undefined>(undefined);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [zenTopic, setZenTopic] = useState<string | null>(null);
  const [zenText, setZenText] = useState("");
  const [zenSpellResults, setZenSpellResults] = useState<Map<number, SpellCheckResult>>(new Map());
  const [zenWordCount, setZenWordCount] = useState(0);
  const [zenTopicLoading, setZenTopicLoading] = useState(false);
  const zenAvailable = !!process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
  const [customText, setCustomText] = useState<string | null>(null);
  const [customPages, setCustomPages] = useState<string[]>([]);
  const [customPageIndex, setCustomPageIndex] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setUnlockedDrillLevels(getUnlockedDrillLevels());
    setUnlockedDifficulties(getUnlockedDifficulties());
    const levels = ["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"];
    const dp: Record<string, number> = {};
    for (const l of levels) dp[l] = getLevelQualifyingSessions(`drill:${l}`);
    setDrillProgress(dp);
    const diffs = ["beginner", "intermediate", "advanced"];
    const dfp: Record<string, number> = {};
    for (const d of diffs) dfp[d] = getLevelQualifyingSessions(`passage:${d}`);
    setDifficultyProgress(dfp);
    const p = getProgress();
    setXp(p.xp || 0);
    setBestWpm(p.bestWpm);
    setBestAccuracy(p.bestAccuracy);
    setPracticeTargets(p.practiceTargets);
    if (!initialDrillLevelSetRef.current) {
      initialDrillLevelSetRef.current = true;
      const highest = getHighestUnlockedDrillLevel() as DrillLevel;
      if (highest !== "home-row") setDrillLevel(highest);
    }
  }, [unlockVersion]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [currentPassage, setCurrentPassage] = useState<{ text: string; source: string }>({ text: "", source: "" });
  const currentText = currentPassage.text;

  /* eslint-disable react-hooks/set-state-in-effect */
  // Fetch zen topic on first zen mode entry
  const zenTopicFetchedRef = useRef(false);
  useEffect(() => {
    if (mode === "zen" && !zenTopic && !zenTopicLoading && !zenTopicFetchedRef.current) {
      zenTopicFetchedRef.current = true;
      setZenTopicLoading(true);
      fetchZenTopic().then((t) => { setZenTopic(t); setZenTopicLoading(false); });
    }
  }, [mode, zenTopic, zenTopicLoading]);

  useEffect(() => {
    if (mode === "zen" || mode === "custom") return;
    if (mode === "drill") {
      const config = DRILL_LEVELS.find((l) => l.level === drillLevel) || DRILL_LEVELS[0];
      setCurrentPassage({ text: generateDrillText(config, 50, unlockedDrillLevels, practiceTargets), source: "" });
    } else {
      const cat = passageCategory === "all" ? undefined : passageCategory;
      const passage = getRandomPassage(passageDifficulty, cat);
      setCurrentPassage({ text: passage.text, source: passage.source });
    }
  }, [mode, drillLevel, passageDifficulty, passageCategory, textKey, unlockedDrillLevels, practiceTargets]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const fetchTip = useCallback(async (keyStrokes: KeyStroke[], text: string) => {
    const timingMeta = computeSessionTimingMetadata(keyStrokes);
    const progress = getProgress();
    const patterns = detectErrorPatterns(keyStrokes, recentErrorsRef.current, timingMeta, progress.errorHeatmap);
    if (patterns.length === 0) return;
    setTipLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_PROGRESS_API_KEY;
      const res = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey || "" },
        body: JSON.stringify({ prompt: buildTipPrompt(patterns, text, timingMeta) }),
      });
      if (res.ok) {
        const { tip, explanation } = await res.json();
        if (tip) {
          setCurrentTip(tip);
          const progress = getProgress();
          progress.tips = [{ text: tip, explanation, createdAt: new Date().toISOString() }, ...(progress.tips || [])].slice(0, 20);
          localStorage.setItem("typing-trainer-progress", JSON.stringify(progress));
        }
      }
    } catch {
      // Silent fail
    } finally {
      setTipLoading(false);
    }
  }, []);

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
      recentErrorsRef.current.push(last);
      const errorCount = keyStrokes.filter((k) => !k.correct).length;
      if (errorCount >= 5 && !tipCooldownRef.current && !tipLoading) {
        tipCooldownRef.current = true;
        setTimeout(() => fetchTip(keyStrokes, currentText), 0);
        setTimeout(() => { tipCooldownRef.current = false; }, 30000);
      }
    }
  }, [tipLoading, currentText, fetchTip]);

  useEffect(() => {
    loadFromRemote().then((remote) => {
      if (remote) {
        const local = getProgress();
        const merged = mergeProgress(local, remote);
        localStorage.setItem("typing-trainer-progress", JSON.stringify(merged));
        setUnlockVersion((v) => v + 1);
      }
    });
  }, []);

  const handleComplete = useCallback(
    (keyStrokes: KeyStroke[]) => {
      const stats = buildSessionStats(keyStrokes);
      setSessionStats(stats);
      setIsActive(false);
      setSessionResults((prev) => [...prev, { wpm: stats.wpm, accuracy: stats.accuracy }]);
      const modeLabel = mode === "drill" ? `drill:${drillLevel}` : mode === "custom" ? "custom" : `passage:${passageDifficulty}`;
      const timingMetadata = computeSessionTimingMetadata(keyStrokes);
      const enrichment = {
        modeDetails: {
          type: mode as "drill" | "passage" | "custom",
          level: mode === "drill" ? drillLevel : mode === "custom" ? undefined : passageDifficulty,
          category: mode === "passage" ? (passageCategory === "all" ? undefined : passageCategory) : undefined,
        },
        timingMetadata,
      };
      const { progress: updated, session } = recordSession(stats, modeLabel, enrichment);

      let demotionTarget: DrillLevel | null = null;
      if (mode === "drill") {
        const result = processDrillDemotion(updated, stats.accuracy, drillLevel);
        if (result.demoted && result.toLevel) {
          demotionTarget = result.toLevel as DrillLevel;
          setDemotionNotice({ from: result.fromLevel ?? drillLevel, to: result.toLevel });
          setTimeout(() => setDemotionNotice(null), 5000);
        }
      }
      setUnlockVersion((v) => v + 1);

      // Award base XP + check badges + achievements
      const oldLevel = getLevelFromXp(updated.xp || 0).level;
      const baseXp = 5 + (stats.accuracy >= 95 ? 5 : stats.accuracy >= 85 ? 3 : 0);
      updated.xp = (updated.xp || 0) + baseXp;
      const newLevel = getLevelFromXp(updated.xp).level;

      // Badge unlock check
      if (newLevel > oldLevel) {
        const newBadges = checkBadgeUnlocks(oldLevel, newLevel, updated.badges || []);
        if (newBadges.length > 0) {
          const now = new Date().toISOString();
          if (!updated.badges) updated.badges = [];
          for (const b of newBadges) updated.badges.push({ id: b.id, unlockedAt: now });
          setNewBadge(newBadges[newBadges.length - 1]);
          setTimeout(() => setNewBadge(null), 4000);
        }
      }

      const context: AchievementContext = {
        totalSessions: updated.totalSessions,
        totalCharsTyped: updated.totalCharsTyped,
        bestWpm: updated.bestWpm,
        bestAccuracy: updated.bestAccuracy,
        currentStreak: updated.currentStreak,
        bestStreak: updated.bestStreak,
        sessionWpm: stats.wpm,
        sessionAccuracy: stats.accuracy,
        levelProgress: updated.levelProgress,
      };
      const earned = checkAchievements(context, updated.achievements.map((a) => a.id));
      if (earned.length > 0) {
        const now = new Date().toISOString();
        for (const a of earned) {
          updated.achievements.push({ id: a.id, unlockedAt: now });
          updated.xp += a.xp;
        }
        setNewAchievements(earned);
        setTimeout(() => setNewAchievements([]), 4000);
      }

      // Update practice targets from analytics
      const patterns = detectErrorPatterns(keyStrokes, recentErrorsRef.current, timingMetadata, updated.errorHeatmap);
      updated.practiceTargets = updatePracticeTargets(updated.errorHeatmap, timingMetadata, patterns);

      localStorage.setItem("typing-trainer-progress", JSON.stringify(updated));
      syncToRemote(updated, session).then((result) => {
        if (!result.ok && result.reason !== "not-configured") {
          const reason = result.reason === "network"
            ? "Sync failed — network error. Progress saved locally."
            : `Sync failed (HTTP ${result.status ?? "?"}). Progress saved locally.`;
          setSyncError(reason);
          setTimeout(() => setSyncError(null), 6000);
        }
      });

      if (demotionTarget) {
        setDrillLevel(demotionTarget);
      } else if (mode === "drill") {
        // Auto-progression: advance drill level if next level just unlocked
        const newUnlocked = getUnlockedDrillLevels();
        const levels: DrillLevel[] = ["home-row", "top-row", "bottom-row", "numbers", "symbols", "full"];
        const currentIdx = levels.indexOf(drillLevel);
        if (currentIdx < levels.length - 1 && newUnlocked.has(levels[currentIdx + 1]) && !unlockedDrillLevels.has(levels[currentIdx + 1])) {
          setDrillLevel(levels[currentIdx + 1]);
        }
      }
    },
    [mode, drillLevel, passageDifficulty, passageCategory, unlockedDrillLevels]
  );

  const handleNext = useCallback(() => {
    setSessionStats(null);
    setLiveWpm(0);
    setLiveAccuracy(0);
    setIsActive(false);
    setElapsed(0);
    setCombo(0);
    setPosition(0);
    setCurrentTip(null);
    setZenText("");
    setZenSpellResults(new Map());
    setZenWordCount(0);
    recentErrorsRef.current = [];
    if (mode === "custom" && customPages.length > 1 && customPageIndex < customPages.length - 1) {
      const next = customPageIndex + 1;
      setCustomPageIndex(next);
      setCurrentPassage({ text: customPages[next], source: `Custom (page ${next + 1}/${customPages.length})` });
    } else {
      if (mode === "custom") {
        setCustomText(null);
        setCustomPages([]);
        setCustomPageIndex(0);
      }
      setTextKey((k) => k + 1);
    }
  }, [mode, customPages, customPageIndex]);

  const handleFetchZenTopic = useCallback(async () => {
    zenTopicFetchedRef.current = true;
    setZenTopicLoading(true);
    setZenText("");
    setZenWordCount(0);
    setZenSpellResults(new Map());
    const topic = await fetchZenTopic();
    setZenTopic(topic);
    setZenTopicLoading(false);
  }, []);

  const handleZenProgress = useCallback((wc: number, keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => {
    setZenWordCount(wc);
    setZenText(text);
    setZenSpellResults(spellResults);
    setIsActive(true);
    if (keyStrokes.length >= 2) {
      const duration = keyStrokes[keyStrokes.length - 1].timestamp - keyStrokes[0].timestamp;
      const chars = keyStrokes.length;
      setLiveWpm(Math.round((chars / 5) / (duration / 60000)));
      setElapsed(duration);
    }
    // Live accuracy from spell-check results received so far
    if (spellResults.size > 0) {
      let correct = 0;
      for (const r of spellResults.values()) { if (r.correct) correct++; }
      setLiveAccuracy(Math.round((correct / spellResults.size) * 100));
    } else {
      setLiveAccuracy(100);
    }
  }, []);

  const handleZenComplete = useCallback((keyStrokes: KeyStroke[], text: string, spellResults: Map<number, SpellCheckResult>) => {
    const stats = buildZenSessionStats(keyStrokes, text, spellResults, zenTopic || "");
    setZenText(text);
    setZenSpellResults(spellResults);
    setIsActive(false);
    setSessionStats({ wpm: stats.wpm, accuracy: stats.accuracy, totalChars: text.length, correctChars: text.length, errors: stats.misspelledWords.length, duration: stats.duration, keyStrokes });
    setSessionResults((prev) => [...prev, { wpm: stats.wpm, accuracy: stats.accuracy }]);

    const modeLabel = "zen";
    const timingMetadata = computeSessionTimingMetadata(keyStrokes);
    const enrichment = {
      modeDetails: { type: "zen" as const, topic: zenTopic || "", wordCount: stats.wordCount, misspelledWords: stats.misspelledWords },
      timingMetadata,
    };
    const { progress: updated, session } = recordSession({ wpm: stats.wpm, accuracy: stats.accuracy, totalChars: text.length, correctChars: text.length - (stats.misspelledWords.length * 5), errors: stats.misspelledWords.length, duration: stats.duration, keyStrokes }, modeLabel, enrichment);

    setUnlockVersion((v) => v + 1);
    const zenOldLevel = getLevelFromXp(updated.xp || 0).level;
    const baseXp = 5 + (stats.accuracy >= 95 ? 5 : stats.accuracy >= 85 ? 3 : 0);
    updated.xp = (updated.xp || 0) + baseXp;
    const zenNewLevel = getLevelFromXp(updated.xp).level;

    if (zenNewLevel > zenOldLevel) {
      const newBadges = checkBadgeUnlocks(zenOldLevel, zenNewLevel, updated.badges || []);
      if (newBadges.length > 0) {
        const now = new Date().toISOString();
        if (!updated.badges) updated.badges = [];
        for (const b of newBadges) updated.badges.push({ id: b.id, unlockedAt: now });
        setNewBadge(newBadges[newBadges.length - 1]);
        setTimeout(() => setNewBadge(null), 4000);
      }
    }

    const context: AchievementContext = {
      totalSessions: updated.totalSessions,
      totalCharsTyped: updated.totalCharsTyped,
      bestWpm: updated.bestWpm,
      bestAccuracy: updated.bestAccuracy,
      currentStreak: updated.currentStreak,
      bestStreak: updated.bestStreak,
      sessionWpm: stats.wpm,
      sessionAccuracy: stats.accuracy,
      levelProgress: updated.levelProgress,
    };
    const earned = checkAchievements(context, updated.achievements.map((a) => a.id));
    if (earned.length > 0) {
      const now = new Date().toISOString();
      for (const a of earned) {
        updated.achievements.push({ id: a.id, unlockedAt: now });
        updated.xp += a.xp;
      }
      setNewAchievements(earned);
      setTimeout(() => setNewAchievements([]), 4000);
    }

    localStorage.setItem("typing-trainer-progress", JSON.stringify(updated));
    syncToRemote(updated, session).then((result) => {
      if (!result.ok && result.reason !== "not-configured") {
        setSyncError(result.reason === "network" ? "Sync failed — network error." : `Sync failed (HTTP ${result.status ?? "?"}).`);
        setTimeout(() => setSyncError(null), 6000);
      }
    });
  }, [zenTopic]);

  const handleCustomStart = useCallback((text: string) => {
    const pages = paginateText(text);
    setCustomText(text);
    setCustomPages(pages);
    setCustomPageIndex(0);
    setCurrentPassage({ text: pages[0], source: `Custom (page 1/${pages.length})` });
  }, []);

  const handleNewZenTopic = useCallback(() => {
    if (isActive && zenWordCount > 0) {
      setIsActive(false);
      setSessionStats(null);
      setLiveWpm(0);
      setElapsed(0);
    }
    handleFetchZenTopic();
  }, [isActive, zenWordCount, handleFetchZenTopic]);

  const handleKeyPress = useCallback((key: string, code: string, correct: boolean | null) => {
    clearTimeout(activeKeyTimeoutRef.current);
    const state = { key, code, correct, timestamp: performance.now() };
    activeKeyRef.current = state;
    setActiveKey(state);
    activeKeyTimeoutRef.current = setTimeout(() => { activeKeyRef.current = null; setActiveKey(null); }, 150);
    if (soundEnabledRef.current && correct !== null) {
      if (correct) playKeyClick();
      else playKeyError();
    }
  }, []);

  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeKeyRef.current?.code === e.code) {
        clearTimeout(activeKeyTimeoutRef.current);
        activeKeyRef.current = null;
        setActiveKey(null);
      }
    };
    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, []);

  useEffect(() => {
    if (!sessionStats) return;
    const timer = setTimeout(() => {
      const handleEnterForNext = (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
      };
      window.addEventListener("keydown", handleEnterForNext, { once: true });
      return () => window.removeEventListener("keydown", handleEnterForNext);
    }, 300);
    return () => clearTimeout(timer);
  }, [sessionStats, handleNext]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-transparent transition-colors relative">
      <BadgeToast badge={newBadge} />
      <div className="ambient-bg" aria-hidden="true" />
      <header className="dark:bg-[#141414]/80 border-b border-slate-200 dark:border-neutral-800/50 sticky top-0 z-10 backdrop-blur-sm relative">
        <div className="w-full px-6 sm:px-10 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-800 dark:text-neutral-300 flex items-center gap-2">
            <FontAwesomeIcon icon={faKeyboard} className="w-5 h-5 text-[#00ff88]" />
            NeuralKeys
          </h1>
          <XpBar xp={xp} />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSoundEnabled((s) => { soundEnabledRef.current = !s; return !s; })}
              className={`p-3 transition-colors ${soundEnabled ? "text-[#00ff88]" : "text-neutral-300 hover:text-white"}`}
              aria-label={soundEnabled ? "Disable sound" : "Enable sound"}
              aria-pressed={soundEnabled}
            >
              <FontAwesomeIcon icon={soundEnabled ? faVolumeHigh : faVolumeXmark} className="w-4 h-4" />
            </button>
            <Link href="/stats" className="p-3 text-neutral-300 hover:text-[#00ff88] transition-colors" title="Stats">
              <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />
            </Link>
            <button
              onClick={onLogout}
              className="p-3 text-neutral-300 hover:text-red-400 transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>


      {demotionNotice && (
        <div className="relative w-full px-6 sm:px-10 pt-3" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/40 text-sm text-amber-200">
            <span aria-hidden="true">↓</span>
            <span>
              Dropped to <span className="font-medium capitalize">{demotionNotice.to.replace("-", " ")}</span> — let&apos;s rebuild accuracy on <span className="capitalize">{demotionNotice.from.replace("-", " ")}</span>.
            </span>
          </div>
        </div>
      )}

      {syncError && (
        <div className="relative w-full px-6 sm:px-10 pt-3" role="status" aria-live="polite">
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-200">
            <span aria-hidden="true">⚠</span>
            <span>{syncError}</span>
          </div>
        </div>
      )}

      <div className="relative w-full px-6 sm:px-10 py-8 space-y-10">
        <div className="flex items-start justify-between gap-4">
          <ModeSelector
            mode={mode}
            drillLevel={drillLevel}
            passageDifficulty={passageDifficulty}
            passageCategory={passageCategory}
            unlockedDrillLevels={unlockedDrillLevels}
            unlockedDifficulties={unlockedDifficulties}
            drillProgress={drillProgress}
            difficultyProgress={difficultyProgress}
            unlockThreshold={UNLOCK_SESSIONS_REQUIRED}
            zenAvailable={zenAvailable}
            zenTopic={zenTopic || undefined}
            zenTopicLoading={zenTopicLoading}
            onModeChange={(m) => { setMode(m); handleNext(); }}
            onDrillLevelChange={(l) => { setDrillLevel(l); handleNext(); }}
            onDifficultyChange={(d) => { setPassageDifficulty(d); handleNext(); }}
            onCategoryChange={(c) => { setPassageCategory(c); handleNext(); }}
            onNewZenTopic={handleNewZenTopic}
          />

          {(isActive || sessionStats) && (
            <div className="animate-fade-in">
              <InlineStats
                wpm={sessionStats?.wpm ?? liveWpm}
                accuracy={sessionStats?.accuracy ?? liveAccuracy}
                elapsed={sessionStats ? Math.round(sessionStats.duration / 1000) : Math.round(elapsed / 1000)}
                combo={mode !== "zen" ? combo : 0}
                isActive={isActive}
              />
            </div>
          )}
        </div>

        {mode !== "zen" && (
          <LevelProgress
            mode={mode}
            qualifying={mode === "drill" ? (drillProgress[drillLevel] ?? 0) : (difficultyProgress[passageDifficulty] ?? 0)}
            threshold={UNLOCK_SESSIONS_REQUIRED}
            label={mode === "drill" ? drillLevel.replace("-", " ") : passageDifficulty}
          />
        )}

        {mode === "drill" && <AdaptiveTargetIndicator mode={mode} drillLevel={drillLevel} targets={practiceTargets} />}

        <div className="relative">
          <TipBox tip={currentTip} loading={tipLoading} />
          {mode === "zen" ? (
            zenTopic && !zenTopicLoading ? (
              <ZenTypingArea
                topic={zenTopic}
                onProgress={handleZenProgress}
                onComplete={handleZenComplete}
              />
            ) : !zenTopicLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3" role="status" aria-live="polite">
                <p className="text-sm text-neutral-400">Couldn&apos;t generate topic</p>
                <button onClick={handleFetchZenTopic} className="px-4 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors">Try again</button>
              </div>
            ) : null
          ) : mode === "custom" && !customText ? (
            <CustomTextInput onStart={handleCustomStart} />
          ) : (
            <GlowBorder radius="1rem" intensity="punchy">
              <TypingArea
                text={currentText}
                onComplete={handleComplete}
                onProgress={handleProgress}
                onKeyPress={handleKeyPress}
              />
            </GlowBorder>
          )}
        </div>

        {sessionStats && newAchievements.length > 0 && (
          <div className="text-center">
            <div className="space-y-2" role="status" aria-live="polite" aria-atomic="true">
              {newAchievements.map((a) => (
                <div key={a.id} className="inline-flex items-center gap-2 px-4 py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg text-sm animate-[pulse_2s_ease-in-out_infinite]">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-[#00ff88] font-medium">{a.name}</span>
                  <span className="text-neutral-500 text-xs">+{a.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "zen" ? (
          <ZenResponsePanel text={zenText} spellResults={zenSpellResults} />
        ) : (
          <VisualKeyboard
            activeKey={activeKey}
            nextExpectedKey={position < currentText.length ? currentText[position] : null}
          />
        )}

        {mode === "passage" && !sessionStats && currentPassage.source && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            {currentPassage.source}
          </p>
        )}
      </div>
    </main>
  );
}

const XpBar = memo(function XpBar({ xp }: { xp: number }) {
  const { level, currentXp, nextLevelXp } = getLevelFromXp(xp);
  const pct = Math.min(100, Math.round((currentXp / nextLevelXp) * 100));
  const badge = getCurrentBadge(level);

  return (
    <div className="flex items-center gap-2 group/xp relative">
      {badge && <BadgeIcon badge={badge} size="sm" />}
      <span className="text-xs font-bold text-[#00ff88]">Lv.{level}</span>
      <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={currentXp} aria-valuemax={nextLevelXp} aria-label={`Level ${level} progress: ${pct}%`}>
        <div className="h-full bg-[#00ff88]/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-neutral-400">{xp} XP</span>
      <span className="text-neutral-500 hover:text-neutral-300 cursor-help text-xs" aria-label="How XP works">
        &#9432;
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-56 p-3 text-xs text-neutral-200 bg-neutral-900 border border-neutral-700 rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)] opacity-0 group-hover/xp:opacity-100 pointer-events-none transition-opacity z-50 leading-relaxed">
          <strong className="text-[#00ff88]">XP System</strong><br />
          +5 per session<br />
          +3 bonus at 85%+ accuracy<br />
          +5 bonus at 95%+ accuracy<br />
          Achievements award extra XP
        </span>
      </span>
    </div>
  );
});

function LevelProgress({ qualifying, threshold, label }: { mode: TrainingMode; qualifying: number; threshold: number; label: string }) {
  const capped = Math.min(qualifying, threshold);
  const isMaxed = capped >= threshold;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-200 capitalize">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: threshold }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < capped
                ? isMaxed ? "bg-[#00ff88]" : "bg-[#00ff88]/60"
                : "bg-neutral-600"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-neutral-300">
        {isMaxed ? "complete" : `${capped}/${threshold}`}
      </span>
    </div>
  );
}

const InlineStats = memo(function InlineStats({ wpm, accuracy, elapsed, combo, isActive }: { wpm: number; accuracy: number; elapsed: number; combo: number; isActive: boolean }) {
  return (
    <div className={`flex items-center gap-5 transition-opacity ${isActive ? "opacity-100" : "opacity-60"}`} aria-live="off">
      <div className="text-right">
        <span className="text-lg font-bold text-emerald-400">{wpm}</span>
        <span className="text-xs text-neutral-500 ml-1">WPM</span>
      </div>
      <div className="text-right">
        <span className={`text-lg font-bold ${accuracy >= 95 ? "text-emerald-400" : accuracy >= 80 ? "text-amber-400" : "text-red-400"}`}>{accuracy}%</span>
        <span className="text-xs text-neutral-500 ml-1">Acc</span>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold text-neutral-400">{elapsed}s</span>
      </div>
      {combo > 2 && (
        <div className="text-right">
          <span className="text-lg font-bold text-orange-400">{combo}</span>
          <span className="text-xs text-neutral-500 ml-1">Combo</span>
        </div>
      )}
    </div>
  );
});

const AdaptiveTargetIndicator = memo(function AdaptiveTargetIndicator({ mode, drillLevel, targets: rawTargets }: { mode: TrainingMode; drillLevel: DrillLevel; targets: PracticeTargets | undefined }) {
  if (mode !== "drill" || !rawTargets) return null;

  const config = DRILL_LEVELS.find((l) => l.level === drillLevel) || DRILL_LEVELS[0];
  const targets = filterTargetsForLevel(rawTargets, config.chars);
  if (targets.chars.length === 0 && targets.bigrams.length === 0) return null;

  const allTargets = [
    ...targets.chars.slice(0, 5).map((c) => c === " " ? "space" : c),
    ...targets.bigrams.slice(0, 3).map((b) => `"${b}"`),
  ];

  return (
    <div className="flex items-center gap-2" title={`Adaptive targeting: ${allTargets.join(", ")}`}>
      <span className="text-xs text-amber-400">🎯</span>
      <span className="text-xs text-neutral-300">
        Targeting: <span className="text-amber-300">{allTargets.join(", ")}</span>
      </span>
    </div>
  );
});
