"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faGauge, faBullseye, faFire, faKeyboard, faChartLine, faRightFromBracket, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { getProgress, clearUserPin, loadFullHistory, type ProgressData } from "@/lib/progress";
import type { EnrichedSessionSummary } from "@/lib/types";
import KeyboardHeatmap from "@/components/KeyboardHeatmap";
import WpmChart from "@/components/charts/WpmChart";
import AccuracyChart from "@/components/charts/AccuracyChart";
import SessionsPerWeek from "@/components/charts/SessionsPerWeek";
import PracticeHeatmap from "@/components/charts/PracticeHeatmap";
import ModeBreakdown from "@/components/charts/ModeBreakdown";
import ErrorDistribution from "@/components/charts/ErrorDistribution";
import BigramChart from "@/components/charts/BigramChart";
import AnalyticsSummary from "@/components/charts/AnalyticsSummary";

export default function StatsPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [allSessions, setAllSessions] = useState<EnrichedSessionSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProgress(getProgress());
    loadFullHistory().then((sessions) => {
      setAllSessions(sessions);
      setLoadingHistory(false);
    }).catch(() => setLoadingHistory(false));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = () => {
    clearUserPin();
    localStorage.removeItem("typing-trainer-progress");
    router.push("/");
  };

  if (!progress) return null;

  const sessions = allSessions.length > 0 ? allSessions : progress.recentSessions;

  const avgWpm =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length)
      : 0;

  const avgAccuracy =
    sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length)
      : 0;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0d0d0d]">
      <header className="dark:bg-[#141414] border-b border-slate-200 dark:border-neutral-800/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="w-full px-6 sm:px-10 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-neutral-400 hover:text-[#00ff88] transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
            </Link>
            <h1 className="text-lg font-bold text-slate-800 dark:text-neutral-300 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="w-5 h-5 text-[#00ff88]" />
              Stats
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-neutral-600 hover:text-red-400 transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="w-full px-6 sm:px-10 py-8 space-y-10">
        {/* Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <BigStat icon={faKeyboard} value={progress.totalSessions} label="Sessions" />
          <BigStat icon={faGauge} value={progress.bestWpm} label="Best WPM" color="text-[#00ff88]" />
          <BigStat icon={faBullseye} value={`${progress.bestAccuracy}%`} label="Best Accuracy" color="text-[#00ff88]" />
          <BigStat icon={faFire} value={progress.bestStreak} label="Best Streak" color="text-orange-400" />
        </div>

        {/* Averages */}
        <div className="text-center space-y-1">
          <h2 className="text-sm text-neutral-500 uppercase tracking-wider">Recent Average</h2>
          <div className="flex items-center justify-center gap-10">
            <div>
              <span className="text-3xl font-bold text-neutral-200">{avgWpm}</span>
              <span className="text-sm text-neutral-500 ml-1">WPM</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-neutral-200">{avgAccuracy}%</span>
              <span className="text-sm text-neutral-500 ml-1">accuracy</span>
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="text-center space-y-1">
          <h2 className="text-sm text-neutral-500 uppercase tracking-wider">Current Streak</h2>
          <div className="text-4xl font-bold text-orange-400">
            {progress.currentStreak} day{progress.currentStreak !== 1 ? "s" : ""}
          </div>
          <p className="text-xs text-neutral-600">
            {progress.totalCharsTyped.toLocaleString()} characters typed total
          </p>
        </div>

        {/* Loading indicator for full history */}
        {loadingHistory && (
          <div className="text-center text-neutral-500 text-sm">
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin mr-2" />
            Loading full history...
          </div>
        )}

        {/* Charts */}
        <WpmChart sessions={sessions} />
        <AccuracyChart sessions={sessions} />
        <AnalyticsSummary sessions={sessions} />
        <PracticeHeatmap sessions={sessions} />
        <SessionsPerWeek sessions={sessions} />
        <ModeBreakdown sessions={sessions} />
        <BigramChart sessions={sessions} />
        <ErrorDistribution errorHeatmap={progress.errorHeatmap} />

        {/* Error Heatmap Keyboard */}
        {Object.keys(progress.errorHeatmap).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Error Heatmap</h2>
            <KeyboardHeatmap errorHeatmap={progress.errorHeatmap} />
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Recent Sessions</h2>
            <div className="space-y-1.5">
              {sessions.slice(0, 20).map((session, i) => (
                <div key={session.id || i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-neutral-800/30">
                  <span className="text-xs text-neutral-500">{session.date}</span>
                  <span className="text-xs text-neutral-400">{session.mode}</span>
                  {session.duration > 0 && (
                    <span className="text-xs text-neutral-600">{Math.round(session.duration / 1000)}s</span>
                  )}
                  <span className="text-sm font-bold text-neutral-200">{session.wpm} WPM</span>
                  <span className={`text-sm font-bold ${session.accuracy >= 95 ? "text-[#00ff88]" : session.accuracy >= 80 ? "text-amber-400" : "text-red-400"}`}>
                    {session.accuracy}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Tips */}
        {progress.tips && progress.tips.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">AI Tips</h2>
            <div className="space-y-2">
              {progress.tips.slice(0, 10).map((tip, i) => (
                <div key={i} className="flex items-start gap-2 px-4 py-2 rounded-lg bg-neutral-800/30">
                  <span className="text-amber-400 mt-0.5">💡</span>
                  <div>
                    <p className="text-sm text-neutral-300">{tip.text}</p>
                    <p className="text-xs text-neutral-600">{tip.createdAt.split("T")[0]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function BigStat({
  icon,
  value,
  label,
  color = "text-neutral-200",
}: {
  icon: typeof faGauge;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div>
      <div className={`text-3xl sm:text-4xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
        <FontAwesomeIcon icon={icon} className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}
