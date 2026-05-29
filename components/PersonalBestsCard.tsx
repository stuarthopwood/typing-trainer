"use client";

import { memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrophy, faBolt, faBullseye, faClock, faCalendarDay, faLink } from "@fortawesome/free-solid-svg-icons";
import { computePersonalBests, computeLifetimeStats, computeFunEquivalences, type PersonalBests, type LifetimeStats } from "@/lib/personal-bests";
import type { EnrichedSessionSummary } from "@/lib/types";

interface PersonalBestsCardProps {
  sessions: EnrichedSessionSummary[];
}

export default memo(function PersonalBestsCard({ sessions }: PersonalBestsCardProps) {
  const pbs = useMemo(() => computePersonalBests(sessions), [sessions]);
  const lifetime = useMemo(() => computeLifetimeStats(sessions), [sessions]);
  const equivalences = useMemo(() => computeFunEquivalences(lifetime), [lifetime]);

  if (sessions.length === 0) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
          <FontAwesomeIcon icon={faTrophy} className="w-4 h-4 text-amber-400" />
          Personal Bests
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          <PbItem icon={faBolt} label="Fastest WPM" value={String(pbs.fastestWpm.value)} date={pbs.fastestWpm.date} color="text-[#00ff88]" />
          <PbItem icon={faBullseye} label="Best Accuracy" value={`${pbs.highestAccuracy.value}%`} date={pbs.highestAccuracy.date} color="text-[#00ff88]" />
          <PbItem icon={faLink} label="Perfect Streak" value={`${pbs.longestPerfectStreak.value} chars`} date={pbs.longestPerfectStreak.date} color="text-cyan-400" />
          <PbItem icon={faClock} label="Longest Session" value={formatDuration(pbs.longestSession.value)} date={pbs.longestSession.date} color="text-neutral-300" />
          <PbItem icon={faCalendarDay} label="Most in a Day" value={`${pbs.mostSessionsInDay.value} sessions`} date={pbs.mostSessionsInDay.date} color="text-orange-400" />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-400 mb-2">Lifetime</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <LifetimeItem label="Characters" value={formatNumber(lifetime.totalChars)} />
          <LifetimeItem label="Sessions" value={String(lifetime.totalSessions)} />
          <LifetimeItem label="Practice Time" value={formatDuration(lifetime.totalTimeMs)} />
          <LifetimeItem label="Days Practised" value={String(lifetime.daysPractised)} />
          <LifetimeItem label="Total Errors" value={formatNumber(lifetime.totalErrors)} />
        </div>
        {equivalences.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {equivalences.map((eq, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-md bg-neutral-800/50 text-neutral-400">
                {eq.value} {eq.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function PbItem({ icon, label, value, date, color }: { icon: typeof faTrophy; label: string; value: string; date: string; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/30">
      <div className="flex items-center gap-1.5 mb-1">
        <FontAwesomeIcon icon={icon} className={`w-3 h-3 ${color}`} />
        <span className="text-xs text-neutral-400">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {date && <p className="text-[10px] text-neutral-500">{date}</p>}
    </div>
  );
}

function LifetimeItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-neutral-800/20">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-sm font-semibold text-neutral-300">{value}</p>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms === 0) return "—";
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
