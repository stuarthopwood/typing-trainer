"use client";

import { memo, useMemo } from "react";
import { computeTimeOfDay, computeWpmSparkline, type TimeOfDayBucket } from "@/lib/deep-analytics";
import type { EnrichedSessionSummary } from "@/lib/types";

interface DeepAnalyticsProps {
  sessions: EnrichedSessionSummary[];
}

export default memo(function DeepAnalytics({ sessions }: DeepAnalyticsProps) {
  const timeOfDay = useMemo(() => computeTimeOfDay(sessions), [sessions]);
  const sparkline = useMemo(() => computeWpmSparkline(sessions), [sessions]);

  if (sessions.length < 5) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-neutral-200">Deep Analytics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* WPM Sparkline */}
        {sparkline.length > 2 && (
          <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30">
            <p className="text-xs text-neutral-400 mb-2">WPM Trend (last {sparkline.length} sessions)</p>
            <WpmSparkline data={sparkline} />
          </div>
        )}

        {/* Time of Day */}
        {timeOfDay.length > 0 && (
          <div className="p-4 rounded-xl bg-neutral-800/30 border border-neutral-700/30">
            <p className="text-xs text-neutral-400 mb-2">Performance by Time of Day</p>
            <TimeOfDayChart data={timeOfDay} />
          </div>
        )}

      </div>
    </div>
  );
});

function WpmSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = data.length * 8;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10" aria-label={`WPM trend from ${data[0]} to ${data[data.length - 1]}`}>
      <polyline
        points={points}
        fill="none"
        stroke="#00ff88"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TimeOfDayChart({ data }: { data: TimeOfDayBucket[] }) {
  const maxWpm = Math.max(...data.map((d) => d.avgWpm));

  return (
    <div className="space-y-2">
      {data.map((bucket) => (
        <div key={bucket.label} className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 w-28 shrink-0">{bucket.label}</span>
          <div className="flex-1 h-4 bg-neutral-800 rounded overflow-hidden">
            <div
              className="h-full bg-[#00ff88]/60 rounded transition-all"
              style={{ width: `${(bucket.avgWpm / maxWpm) * 100}%` }}
            />
          </div>
          <span className="text-xs text-neutral-300 w-12 text-right">{bucket.avgWpm}</span>
        </div>
      ))}
      {data.length > 1 && (() => {
        const best = data.reduce((a, b) => a.avgWpm > b.avgWpm ? a : b);
        const avg = Math.round(data.reduce((s, d) => s + d.avgWpm, 0) / data.length);
        const diff = best.avgWpm - avg;
        if (diff > 2) {
          return <p className="text-xs text-neutral-500 italic mt-1">Sharpest: {best.label} (+{diff} WPM vs avg)</p>;
        }
        return null;
      })()}
    </div>
  );
}

