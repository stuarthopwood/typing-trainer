"use client";

import { memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarWeek, faArrowUp, faArrowDown } from "@fortawesome/free-solid-svg-icons";
import { getRecentWeeklyDigests, type WeeklyDigest } from "@/lib/weekly-digest";
import type { EnrichedSessionSummary } from "@/lib/types";

interface WeeklyDigestCardProps {
  sessions: EnrichedSessionSummary[];
}

export default memo(function WeeklyDigestCard({ sessions }: WeeklyDigestCardProps) {
  const digests = useMemo(() => getRecentWeeklyDigests(sessions, 4), [sessions]);

  if (digests.length === 0) return null;

  const current = digests[0];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
        <FontAwesomeIcon icon={faCalendarWeek} className="w-4 h-4 text-cyan-400" />
        Weekly Digest
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCell label="Sessions" value={String(current.sessions)} />
        <StatCell label="Avg WPM" value={String(current.avgWpm)} highlight={current.improvement !== 0} delta={current.improvement} />
        <StatCell label="Accuracy" value={`${current.avgAccuracy}%`} />
        <StatCell label="Days" value={`${current.daysPractised}/7`} />
      </div>

      {current.insights.length > 0 && (
        <div className="space-y-1">
          {current.insights.map((insight, i) => (
            <p key={i} className="text-xs text-neutral-400 italic">{insight}</p>
          ))}
        </div>
      )}

      {digests.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">Recent weeks</p>
          <div className="flex gap-2">
            {digests.slice(1).map((d, i) => (
              <div key={i} className="flex-1 p-2 rounded-lg bg-neutral-800/30 border border-neutral-700/20 text-center">
                <p className="text-sm font-medium text-neutral-300">{d.avgWpm}</p>
                <p className="text-[10px] text-neutral-500">{d.sessions} sess</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function StatCell({ label, value, highlight, delta }: { label: string; value: string; highlight?: boolean; delta?: number }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/20 text-center">
      <p className="text-lg font-bold text-neutral-200">{value}</p>
      {highlight && delta !== undefined && delta !== 0 && (
        <p className={`text-xs font-medium ${delta > 0 ? "text-[#00ff88]" : "text-red-400"}`}>
          <FontAwesomeIcon icon={delta > 0 ? faArrowUp : faArrowDown} className="w-2.5 h-2.5 mr-0.5" />
          {Math.abs(delta)} WPM
        </p>
      )}
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
