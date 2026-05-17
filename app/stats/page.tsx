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

  const hasBigramData = sessions.some((s) => s.timingMetadata?.slowestBigrams && s.timingMetadata.slowestBigrams.length > 0);

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

      <div className="w-full px-6 sm:px-10 py-6 space-y-6">
        {/* Row 1: Overview stats + streak */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Panel className="col-span-2 sm:col-span-1">
            <BigStat icon={faKeyboard} value={progress.totalSessions} label="Sessions" />
          </Panel>
          <Panel className="col-span-1">
            <BigStat icon={faGauge} value={progress.bestWpm} label="Best WPM" color="text-[#00ff88]" />
          </Panel>
          <Panel className="col-span-1">
            <BigStat icon={faBullseye} value={`${progress.bestAccuracy}%`} label="Best Accuracy" color="text-[#00ff88]" />
          </Panel>
          <Panel className="col-span-1">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-orange-400">{progress.currentStreak}</div>
              <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
                <FontAwesomeIcon icon={faFire} className="w-3 h-3" />
                Day Streak
              </div>
            </div>
          </Panel>
          <Panel className="col-span-1">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-neutral-200">{avgWpm}</div>
              <div className="text-xs text-neutral-500 mt-1">Avg WPM</div>
            </div>
          </Panel>
        </div>

        {/* Row 2: Recent Sessions + AI Tips (actionable items at the top) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessions.length > 0 && (
            <Panel>
              <h2 className="text-sm text-neutral-500 uppercase tracking-wider mb-3">Recent Sessions</h2>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {sessions.slice(0, 15).map((session, i) => (
                  <div key={session.id || i} className="flex items-center justify-between px-3 py-1.5 rounded bg-neutral-800/40">
                    <span className="text-xs text-neutral-500 w-20">{session.date}</span>
                    <span className="text-xs text-neutral-400 w-28 truncate">{session.mode}</span>
                    {session.duration > 0 && (
                      <span className="text-xs text-neutral-600 w-10">{Math.round(session.duration / 1000)}s</span>
                    )}
                    <span className="text-sm font-bold text-neutral-200 w-16 text-right">{session.wpm} WPM</span>
                    <span className={`text-sm font-bold w-12 text-right ${session.accuracy >= 95 ? "text-[#00ff88]" : session.accuracy >= 80 ? "text-amber-400" : "text-red-400"}`}>
                      {session.accuracy}%
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {progress.tips && progress.tips.length > 0 && (
            <Panel>
              <h2 className="text-sm text-neutral-500 uppercase tracking-wider mb-3">AI Tips</h2>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {progress.tips.slice(0, 10).map((tip, i) => (
                  <TipItem key={i} text={tip.text} explanation={tip.explanation} date={tip.createdAt.split("T")[0]} />
                ))}
              </div>
            </Panel>
          )}
        </div>

        {/* Loading indicator */}
        {loadingHistory && (
          <div className="text-center text-neutral-500 text-sm">
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin mr-2" />
            Loading full history...
          </div>
        )}

        {/* Row 3: Performance charts (WPM + Accuracy side by side) */}
        {sessions.length >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel><WpmChart sessions={sessions} /></Panel>
            <Panel><AccuracyChart sessions={sessions} /></Panel>
          </div>
        )}

        {/* Row 4: Analytics summary */}
        {sessions.length >= 3 && (
          <Panel><AnalyticsSummary sessions={sessions} /></Panel>
        )}

        {/* Row 5: Activity (Practice heatmap + Sessions per week) */}
        {sessions.length >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sessions.length > 0 && <Panel><PracticeHeatmap sessions={sessions} /></Panel>}
            <Panel><SessionsPerWeek sessions={sessions} /></Panel>
          </div>
        )}

        {/* Row 6: Weaknesses (Error distribution + Slow bigrams) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.keys(progress.errorHeatmap).length > 0 && (
            <Panel><ErrorDistribution errorHeatmap={progress.errorHeatmap} /></Panel>
          )}
          {hasBigramData && (
            <Panel><BigramChart sessions={sessions} /></Panel>
          )}
        </div>

        {/* Row 7: Deeper analysis (Mode breakdown + Keyboard heatmap) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel><ModeBreakdown sessions={sessions} /></Panel>
          {Object.keys(progress.errorHeatmap).length > 0 && (
            <Panel>
              <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center mb-3">Error Heatmap</h2>
              <KeyboardHeatmap errorHeatmap={progress.errorHeatmap} />
            </Panel>
          )}
        </div>
      </div>
    </main>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-5 ${className}`}>
      {children}
    </div>
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
    <div className="text-center">
      <div className={`text-3xl sm:text-4xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
        <FontAwesomeIcon icon={icon} className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}

function TipItem({ text, explanation, date }: { text: string; explanation?: string; date: string }) {
  const [expanded, setExpanded] = useState(false);
  const hasExplanation = !!explanation;

  return (
    <div
      className={`rounded-lg transition-colors ${hasExplanation ? "cursor-pointer hover:bg-neutral-700/40" : ""} bg-neutral-800/40`}
      onClick={() => hasExplanation && setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="text-amber-400 mt-0.5 text-sm">💡</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-300">{text}</p>
          <p className="text-[10px] text-neutral-600 mt-0.5">{date}</p>
        </div>
        {hasExplanation && (
          <span className={`text-neutral-600 text-xs mt-1 transition-transform ${expanded ? "rotate-180" : ""}`}>
            ▾
          </span>
        )}
      </div>
      {expanded && explanation && (
        <div className="px-3 pb-3 pt-0 ml-7">
          <p className="text-xs text-neutral-400 leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}
