"use client";

import { memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay, faFire, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { getDailyChallengeHistory, getDailyChallengeStreak, type DailyChallengeResult } from "@/lib/daily-challenge";

export default memo(function DailyChallengeStats() {
  const history = useMemo(() => getDailyChallengeHistory(), []);
  const streak = useMemo(() => getDailyChallengeStreak(), []);

  if (history.length === 0) return null;

  const bestWpm = Math.max(...history.map((h) => h.wpm));
  const avgWpm = Math.round(history.reduce((s, h) => s + h.wpm, 0) / history.length);
  const totalAttempts = history.reduce((s, h) => s + h.attempts, 0);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
        <FontAwesomeIcon icon={faCalendarDay} className="w-4 h-4 text-amber-400" />
        Daily Challenge
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Streak" value={`${streak} day${streak !== 1 ? "s" : ""}`} icon={faFire} color="text-orange-400" />
        <StatBox label="Best WPM" value={String(bestWpm)} icon={faTrophy} color="text-amber-400" />
        <StatBox label="Avg WPM" value={String(avgWpm)} color="text-neutral-200" />
        <StatBox label="Days Played" value={String(history.length)} color="text-neutral-200" />
      </div>

      {history.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-neutral-500">Recent ({Math.min(history.length, 14)} days)</p>
          <div className="flex gap-1 flex-wrap">
            {history.slice(0, 14).map((day) => (
              <div
                key={day.date}
                className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-medium bg-amber-400/10 border border-amber-400/20 text-amber-300"
                title={`${day.date}: ${day.wpm} WPM, ${day.accuracy}% (${day.attempts} attempt${day.attempts !== 1 ? "s" : ""})`}
              >
                {day.wpm}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

function StatBox({ label, value, icon, color = "text-neutral-200" }: { label: string; value: string; icon?: typeof faFire; color?: string }) {
  return (
    <div className="p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/30 text-center">
      <p className={`text-lg font-bold ${color}`}>
        {icon && <FontAwesomeIcon icon={icon} className="w-3 h-3 mr-1" />}
        {value}
      </p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
