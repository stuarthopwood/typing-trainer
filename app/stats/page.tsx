"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faChartLine,
  faRightFromBracket,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import {
  getProgress,
  clearUserPin,
  recalculateProgress,
  type ProgressData,
} from "@/lib/progress";
import {
  loadAllSessions,
  migrateAllSessions,
  deleteSession,
} from "@/lib/sessions";
import UndoToast from "@/components/UndoToast";
import type { EnrichedSessionSummary } from "@/lib/types";
import StatsTabs from "@/components/StatsTabs";
import type { HeatmapCase } from "@/components/KeyboardHeatmap";

export default function StatsPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [allSessions, setAllSessions] = useState<EnrichedSessionSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [heatmapCase, setHeatmapCase] = useState<HeatmapCase>("lower");
  const [pendingDeletes, setPendingDeletes] = useState<
    Record<string, EnrichedSessionSummary>
  >({});
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pendingTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const p = getProgress();
    setProgress(p);
    migrateAllSessions()
      .then(() => loadAllSessions())
      .then((sessions) => {
        const local = p.recentSessions || [];
        const seen = new Set(sessions.map((s) => s.id));
        // Keep id-less local sessions too: legacy sessions saved before the
        // `id` field existed can't be deduped, but dropping them shrinks the
        // displayed set below the chart threshold once the remote load lands,
        // which makes the history charts flash in then vanish. They still
        // carry the date/wpm/mode the charts need.
        const merged = [
          ...sessions,
          ...local.filter((s) => !s.id || !seen.has(s.id)),
        ];
        merged.sort((a, b) =>
          (b.timestamp || b.date).localeCompare(a.timestamp || a.date),
        );
        setAllSessions(merged);
        setLoadingHistory(false);
      })
      .catch(() => {
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
      setPendingDeletes((prev) => {
        const { [sessionId]: _removed, ...rest } = prev;
        return rest;
      });
      const p = recalculateProgress(sessionId);
      setProgress(p);
    } else {
      setPendingDeletes((prev) => {
        const { [sessionId]: session, ...rest } = prev;
        if (session) {
          setAllSessions((s) =>
            [...s, session].sort((a, b) =>
              (b.timestamp || b.date).localeCompare(a.timestamp || a.date),
            ),
          );
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
        setAllSessions((s) =>
          [...s, session].sort((a, b) =>
            (b.timestamp || b.date).localeCompare(a.timestamp || a.date),
          ),
        );
      }
      return rest;
    });
  }, []);

  if (!progress) return null;

  // Show whichever source has more sessions. Before the async history load
  // resolves, `allSessions` is empty and we fall back to localStorage's
  // `recentSessions`; afterwards `allSessions` is the merged superset. Using
  // `max` (not "allSessions if non-empty") guarantees the count never shrinks
  // between the two renders, so charts can't flash in and then unmount.
  const recent = progress.recentSessions ?? [];
  const sessions = allSessions.length >= recent.length ? allSessions : recent;

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

      <div className="w-full px-6 sm:px-10 py-6">
        <StatsTabs
          progress={progress}
          sessions={sessions}
          loadingHistory={loadingHistory}
          heatmapCase={heatmapCase}
          onHeatmapCaseChange={setHeatmapCase}
          onDeleteSession={handleDelete}
        />

        {loadingHistory && (
          <div className="text-center text-neutral-300 text-sm mt-6">
            <FontAwesomeIcon icon={faSpinner} className="w-4 h-4 animate-spin mr-2" />
            Loading full history...
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 sm:right-6 z-30 space-y-2 max-w-sm">
        {deleteError && (
          <div
            className="px-4 py-3 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-200"
            role="alert"
          >
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
