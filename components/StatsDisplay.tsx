"use client";

import type { SessionStats } from "@/lib/types";

interface StatsDisplayProps {
  stats: SessionStats | null;
  liveWpm: number;
  liveAccuracy: number;
  isActive: boolean;
}

export default function StatsDisplay({ stats, liveWpm, liveAccuracy, isActive }: StatsDisplayProps) {
  const wpm = stats?.wpm ?? liveWpm;
  const accuracy = stats?.accuracy ?? liveAccuracy;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="WPM" value={wpm} highlight={isActive} />
      <StatCard
        label="Accuracy"
        value={`${accuracy}%`}
        highlight={isActive}
        color={accuracy >= 95 ? "green" : accuracy >= 80 ? "amber" : "red"}
      />
      {stats && (
        <>
          <StatCard label="Chars" value={stats.totalChars} />
          <StatCard label="Errors" value={stats.errors} color={stats.errors > 0 ? "red" : "green"} />
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  color?: "green" | "amber" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-green-600 dark:text-green-400"
      : color === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : color === "red"
          ? "text-red-600 dark:text-red-400"
          : "text-slate-800 dark:text-slate-100";

  return (
    <div className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center ${highlight ? "ring-1 ring-indigo-300 dark:ring-indigo-700" : ""}`}>
      <div className={`text-xl sm:text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  );
}
