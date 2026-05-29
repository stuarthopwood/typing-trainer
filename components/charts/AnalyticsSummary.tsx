"use client";

import type { EnrichedSessionSummary } from "@/lib/types";
import { computeRollingAverage, bucketByTimeOfDay, findPersonalRecords } from "@/lib/analytics";

interface AnalyticsSummaryProps {
  sessions: EnrichedSessionSummary[];
}

export default function AnalyticsSummary({ sessions }: AnalyticsSummaryProps) {
  if (sessions.length < 3) return null;

  const sorted = [...sessions].sort((a, b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));

  const rolling7Wpm = computeRollingAverage(sorted, 7, "wpm");
  const rolling30Wpm = computeRollingAverage(sorted, 30, "wpm");
  const rolling7Acc = computeRollingAverage(sorted, 7, "accuracy");

  const current7Wpm = rolling7Wpm[rolling7Wpm.length - 1]?.value ?? 0;
  const prev7Wpm = rolling7Wpm.length > 7 ? rolling7Wpm[rolling7Wpm.length - 8]?.value ?? current7Wpm : current7Wpm;
  const wpmDelta = current7Wpm - prev7Wpm;

  const current30Wpm = rolling30Wpm[rolling30Wpm.length - 1]?.value ?? 0;
  const current7Acc = rolling7Acc[rolling7Acc.length - 1]?.value ?? 0;

  const timeOfDay = bucketByTimeOfDay(sorted);
  const bestHour = timeOfDay.length > 0
    ? timeOfDay.reduce((best, h) => h.avgWpm > best.avgWpm ? h : best)
    : null;

  const records = findPersonalRecords(sorted);

  const sessionsWithTiming = sorted.filter((s) => s.timingMetadata);
  const avgConsistency = sessionsWithTiming.length > 0
    ? Math.round(sessionsWithTiming.reduce((sum, s) => sum + (s.timingMetadata?.consistencyScore ?? 0), 0) / sessionsWithTiming.length)
    : null;

  const lastFatigue = sessionsWithTiming.length > 0
    ? sessionsWithTiming[sessionsWithTiming.length - 1].timingMetadata?.fatigueRatio ?? 1
    : 1;

  const fatigueLabel = lastFatigue > 1.3 ? "High" : lastFatigue > 1.15 ? "Moderate" : "Low";
  const fatigueColor = lastFatigue > 1.3 ? "text-red-400" : lastFatigue > 1.15 ? "text-amber-400" : "text-[#00ff88]";

  const handSessions = sessionsWithTiming.filter((s) => s.timingMetadata?.leftHand && s.timingMetadata?.rightHand);
  const avgLeftErrorRate = handSessions.length > 0
    ? Math.round(handSessions.reduce((sum, s) => sum + (s.timingMetadata?.leftHand.errorRate ?? 0), 0) / handSessions.length)
    : null;
  const avgRightErrorRate = handSessions.length > 0
    ? Math.round(handSessions.reduce((sum, s) => sum + (s.timingMetadata?.rightHand.errorRate ?? 0), 0) / handSessions.length)
    : null;
  const avgLeftDelay = handSessions.length > 0
    ? Math.round(handSessions.reduce((sum, s) => sum + (s.timingMetadata?.leftHand.avgDelay ?? 0), 0) / handSessions.length)
    : 0;
  const avgRightDelay = handSessions.length > 0
    ? Math.round(handSessions.reduce((sum, s) => sum + (s.timingMetadata?.rightHand.avgDelay ?? 0), 0) / handSessions.length)
    : 0;

  const formatHour = (h: number) => {
    if (h === 0) return "12am";
    if (h < 12) return `${h}am`;
    if (h === 12) return "12pm";
    return `${h - 12}pm`;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-neutral-400 uppercase tracking-wider text-center">Analytics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <AnalyticCard
          label="7-day WPM"
          value={`${current7Wpm}`}
          delta={wpmDelta !== 0 ? `${wpmDelta > 0 ? "+" : ""}${wpmDelta}` : undefined}
          deltaColor={wpmDelta > 0 ? "text-[#00ff88]" : wpmDelta < 0 ? "text-red-400" : undefined}
        />
        <AnalyticCard label="30-day WPM" value={`${current30Wpm}`} />
        <AnalyticCard label="7-day Accuracy" value={`${current7Acc}%`} />
        {avgConsistency !== null && (
          <AnalyticCard label="Consistency" value={`${avgConsistency}ms`} subtitle="stdev (lower = steadier)" />
        )}
        <AnalyticCard label="Fatigue" value={fatigueLabel} valueColor={fatigueColor} />
        {bestHour && (
          <AnalyticCard label="Peak Hour" value={formatHour(bestHour.hour)} subtitle={`${bestHour.avgWpm} WPM avg`} />
        )}
        <AnalyticCard label="Personal Records" value={`${records.length}`} />
        {avgLeftErrorRate !== null && avgRightErrorRate !== null && (
          <>
            <AnalyticCard
              label="Left Hand"
              value={`${avgLeftErrorRate}%`}
              subtitle={`error rate (${avgLeftDelay}ms avg)`}
              valueColor={avgLeftErrorRate > avgRightErrorRate * 1.3 ? "text-red-400" : "text-neutral-200"}
            />
            <AnalyticCard
              label="Right Hand"
              value={`${avgRightErrorRate}%`}
              subtitle={`error rate (${avgRightDelay}ms avg)`}
              valueColor={avgRightErrorRate > avgLeftErrorRate * 1.3 ? "text-red-400" : "text-neutral-200"}
            />
          </>
        )}
      </div>
    </div>
  );
}

function AnalyticCard({ label, value, subtitle, delta, deltaColor, valueColor }: {
  label: string;
  value: string;
  subtitle?: string;
  delta?: string;
  deltaColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-neutral-800/30 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${valueColor || "text-neutral-200"}`}>
        {value}
        {delta && <span className={`text-xs ml-1 ${deltaColor || "text-neutral-400"}`}>{delta}</span>}
      </div>
      <div className="text-xs text-neutral-400 mt-1">{label}</div>
      {subtitle && <div className="text-[10px] text-neutral-500 mt-0.5">{subtitle}</div>}
    </div>
  );
}
