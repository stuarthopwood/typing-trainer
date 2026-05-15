"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faGauge, faBullseye, faFire, faKeyboard, faChartLine } from "@fortawesome/free-solid-svg-icons";
import { getProgress, type ProgressData } from "@/lib/progress";
import KeyboardHeatmap from "@/components/KeyboardHeatmap";

export default function StatsPage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProgress(getProgress());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!progress) return null;

  const avgWpm =
    progress.recentSessions.length > 0
      ? Math.round(progress.recentSessions.reduce((sum, s) => sum + s.wpm, 0) / progress.recentSessions.length)
      : 0;

  const avgAccuracy =
    progress.recentSessions.length > 0
      ? Math.round(progress.recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / progress.recentSessions.length)
      : 0;

  const topErrors = Object.entries(progress.errorHeatmap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0d0d0d]">
      <header className="dark:bg-[#141414] border-b border-slate-200 dark:border-neutral-800/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="w-full px-6 sm:px-10 py-3 flex items-center gap-4">
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
      </header>

      <div className="w-full px-6 sm:px-10 py-8 space-y-10 max-w-3xl mx-auto">
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

        {/* Error Heatmap Keyboard */}
        {topErrors.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Error Heatmap</h2>
            <KeyboardHeatmap errorHeatmap={progress.errorHeatmap} />
          </div>
        )}

        {/* Recent Sessions */}
        {progress.recentSessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Recent Sessions</h2>
            <div className="space-y-1.5">
              {progress.recentSessions.slice(0, 10).map((session, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 rounded-lg bg-neutral-800/30">
                  <span className="text-xs text-neutral-500">{session.date}</span>
                  <span className="text-xs text-neutral-400">{session.mode}</span>
                  <span className="text-sm font-bold text-neutral-200">{session.wpm} WPM</span>
                  <span className={`text-sm font-bold ${session.accuracy >= 95 ? "text-[#00ff88]" : session.accuracy >= 80 ? "text-amber-400" : "text-red-400"}`}>
                    {session.accuracy}%
                  </span>
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
