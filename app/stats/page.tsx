"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faGauge, faBullseye, faFire, faKeyboard, faChartLine, faRightFromBracket, faSpinner, faTrash } from "@fortawesome/free-solid-svg-icons";
import { getProgress, clearUserPin, recalculateProgress, type ProgressData } from "@/lib/progress";
import { loadAllSessions, migrateAllSessions, deleteSession } from "@/lib/sessions";
import UndoToast from "@/components/UndoToast";
import type { EnrichedSessionSummary } from "@/lib/types";
import GlowBorder from "@/components/GlowBorder";
import KeyboardHeatmap, { type HeatmapCase } from "@/components/KeyboardHeatmap";
import Switch from "@/components/Switch";
import WpmChart from "@/components/charts/WpmChart";
import AccuracyChart from "@/components/charts/AccuracyChart";
import SessionsPerWeek from "@/components/charts/SessionsPerWeek";
import PracticeHeatmap from "@/components/charts/PracticeHeatmap";
import ModeBreakdown from "@/components/charts/ModeBreakdown";
import ErrorDistribution from "@/components/charts/ErrorDistribution";
import BigramChart from "@/components/charts/BigramChart";
import AnalyticsSummary from "@/components/charts/AnalyticsSummary";
import BadgeGallery from "@/components/BadgeGallery";
import PersonalBestsCard from "@/components/PersonalBestsCard";

export default function StatsPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [allSessions, setAllSessions] = useState<EnrichedSessionSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [heatmapCase, setHeatmapCase] = useState<HeatmapCase>("lower");
  const [pendingDeletes, setPendingDeletes] = useState<Record<string, EnrichedSessionSummary>>({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pendingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const p = getProgress();
    setProgress(p);
    migrateAllSessions().then(() => loadAllSessions()).then((sessions) => {
      const local = p.recentSessions || [];
      const seen = new Set(sessions.map((s) => s.id));
      const merged = [...sessions, ...local.filter((s) => s.id && !seen.has(s.id))];
      merged.sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date));
      setAllSessions(merged);
      setLoadingHistory(false);
    }).catch(() => {
      setAllSessions(p.recentSessions || []);
      setLoadingHistory(false);
    });
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleLogout = () => {
    clearUserPin();
    localStorage.removeItem("typing-trainer-progress");
    router.push("/");
  };

  const handleDeleteExpire = useCallback(async (sessionId: string) => {
    pendingTimers.current.delete(sessionId);
    const success = await deleteSession(sessionId);
    if (success) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setPendingDeletes((prev) => { const { [sessionId]: _removed, ...rest } = prev; return rest; });
      const p = recalculateProgress(sessionId);
      setProgress(p);
    } else {
      setPendingDeletes((prev) => {
        const { [sessionId]: session, ...rest } = prev;
        if (session) {
          setAllSessions((s) => [...s, session].sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date)));
        }
        return rest;
      });
      setDeleteError("Delete failed — session restored.");
      setTimeout(() => setDeleteError(null), 4000);
    }
  }, []);

  const handleDeleteExpireRef = useRef(handleDeleteExpire);
  handleDeleteExpireRef.current = handleDeleteExpire;

  const handleDelete = useCallback((session: EnrichedSessionSummary) => {
    if (!session.id) return;
    const id = session.id;
    setAllSessions((prev) => prev.filter((s) => s.id !== id));
    setPendingDeletes((prev) => ({ ...prev, [id]: session }));
    const timerId = setTimeout(() => handleDeleteExpireRef.current(id), 5000);
    pendingTimers.current.set(id, timerId);
  }, []);

  const handleUndo = useCallback((sessionId: string) => {
    const timer = pendingTimers.current.get(sessionId);
    if (timer) clearTimeout(timer);
    pendingTimers.current.delete(sessionId);
    setPendingDeletes((prev) => {
      const { [sessionId]: session, ...rest } = prev;
      if (session) {
        setAllSessions((s) => [...s, session].sort((a, b) => (b.timestamp || b.date).localeCompare(a.timestamp || a.date)));
      }
      return rest;
    });
  }, []);

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
              className="p-3 text-neutral-300 hover:text-[#00ff88] transition-colors"
              aria-label="Back to typing"
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
            className="p-3 text-neutral-300 hover:text-red-400 transition-colors"
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
              <div className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
                <FontAwesomeIcon icon={faFire} className="w-3 h-3" />
                Day Streak
              </div>
            </div>
          </Panel>
          <Panel className="col-span-1">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-neutral-200">{avgWpm}</div>
              <div className="text-xs text-neutral-400 mt-1">Avg WPM</div>
            </div>
          </Panel>
        </div>

        {/* Badge Gallery */}
        <Panel><BadgeGallery badges={progress.badges || []} /></Panel>

        {/* Personal Bests & Lifetime Stats */}
        {sessions.length > 0 && (
          <Panel><PersonalBestsCard sessions={sessions} /></Panel>
        )}

        {/* Row 2: Recent Sessions + AI Tips (actionable items at the top) */}
        {(sessions.length > 0 || (progress.tips && progress.tips.length > 0)) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sessions.length > 0 && (
              <Panel className={!(progress.tips && progress.tips.length > 0) ? "lg:col-span-2" : ""}>
                <h2 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">Recent Sessions</h2>
                <div className="space-y-1.5 max-h-72 overflow-y-auto" role="region" aria-label="Recent sessions list">
                  {sessions.slice(0, 15).map((session, i) => (
                    <div key={session.id || i} className="flex items-center justify-between px-3 py-1.5 rounded bg-neutral-800/40 group">
                      <span className="text-xs text-neutral-400 w-20">{session.date}</span>
                      <span className="text-xs text-neutral-300 w-28 truncate">{session.mode}</span>
                      {session.duration > 0 && (
                        <span className="text-xs text-neutral-400 w-10">{Math.round(session.duration / 1000)}s</span>
                      )}
                      <span className="text-sm font-bold text-neutral-200 w-16 text-right">{session.wpm} WPM</span>
                      <span className={`text-sm font-bold w-12 text-right ${session.accuracy >= 95 ? "text-[#00ff88]" : session.accuracy >= 80 ? "text-amber-400" : "text-red-400"}`}>
                        {session.accuracy}%
                      </span>
                      {session.id && (
                        <button
                          onClick={() => handleDelete(session)}
                          className="p-4 text-neutral-600 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-red-400/60 focus:ring-offset-1 focus:ring-offset-neutral-800 rounded"
                          aria-label={`Delete session from ${session.date} — ${session.wpm} WPM`}
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {progress.tips && progress.tips.length > 0 && (
              <Panel className={sessions.length === 0 ? "lg:col-span-2" : ""}>
                <h2 className="text-sm text-neutral-400 uppercase tracking-wider mb-3">AI Tips</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto" tabIndex={0} role="region" aria-label="AI tips list">
                  {progress.tips.slice(0, 10).map((tip, i) => (
                    <TipItem key={i} text={tip.text} explanation={tip.explanation} date={tip.createdAt.split("T")[0]} />
                  ))}
                </div>
              </Panel>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {loadingHistory && (
          <div className="text-center text-neutral-300 text-sm">
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

        {/* Row 6: Keyboard heatmap (full width — primary error visualisation) */}
        {Object.keys(progress.errorHeatmap).length > 0 && (
          <Panel>
            <div className="flex items-center justify-between mb-3 gap-3">
              <h2 className="text-sm text-neutral-400 uppercase tracking-wider">Error Heatmap</h2>
              <Switch
                checked={heatmapCase === "upper"}
                onChange={(c) => setHeatmapCase(c ? "upper" : "lower")}
                labelLeft="abc"
                labelRight="ABC"
                ariaLabel="Toggle between lowercase and uppercase error heatmap"
              />
            </div>
            <KeyboardHeatmap errorHeatmap={progress.errorHeatmap} caseMode={heatmapCase} />
          </Panel>
        )}

        {/* Row 7: Weaknesses (Most missed keys + Slow bigrams) */}
        {(Object.keys(progress.errorHeatmap).length > 0 || hasBigramData) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(progress.errorHeatmap).length > 0 && (
              <Panel className={!hasBigramData ? "lg:col-span-2" : ""}><ErrorDistribution errorHeatmap={progress.errorHeatmap} /></Panel>
            )}
            {hasBigramData && (
              <Panel className={Object.keys(progress.errorHeatmap).length === 0 ? "lg:col-span-2" : ""}><BigramChart sessions={sessions} /></Panel>
            )}
          </div>
        )}

        {/* Row 8: Mode breakdown */}
        <Panel><ModeBreakdown sessions={sessions} /></Panel>
      </div>

      {/* Undo toasts + error toast */}
      <div className="fixed bottom-4 right-4 sm:right-6 z-30 space-y-2 max-w-sm">
        {deleteError && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-200" role="alert">
            {deleteError}
          </div>
        )}
        {Object.entries(pendingDeletes).map(([id, session]) => (
          <UndoToast
            key={id}
            message={`Deleted session — ${session.date}, ${session.wpm} WPM`}
            onUndo={() => handleUndo(id)}
            onExpire={() => handleDeleteExpire(id)}
          />
        ))}
      </div>
    </main>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <GlowBorder radius="0.75rem" intensity="normal" className={className}>
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-5 h-full">
        {children}
      </div>
    </GlowBorder>
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
      <div className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
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
      onKeyDown={(e) => { if (hasExplanation && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setExpanded(!expanded); } }}
      tabIndex={hasExplanation ? 0 : undefined}
      role={hasExplanation ? "button" : undefined}
      aria-expanded={hasExplanation ? expanded : undefined}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="text-amber-400 mt-0.5 text-sm">💡</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-300">{text}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{date}</p>
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
