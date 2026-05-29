"use client";

import { memo, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFire, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { buildCalendarData, computeStreaks, generateCalendarGrid, type CalendarDay } from "@/lib/calendar";
import type { EnrichedSessionSummary } from "@/lib/types";

interface StreakCalendarProps {
  sessions: EnrichedSessionSummary[];
}

function getIntensityClass(count: number): string {
  if (count === 0) return "bg-neutral-800/40";
  if (count === 1) return "bg-[#00ff88]/20";
  if (count <= 3) return "bg-[#00ff88]/50";
  return "bg-[#00ff88]/80";
}

export default memo(function StreakCalendar({ sessions }: StreakCalendarProps) {
  const [tooltip, setTooltip] = useState<{ day: CalendarDay | null; x: number; y: number } | null>(null);

  const calendarData = useMemo(() => buildCalendarData(sessions), [sessions]);
  const streaks = useMemo(() => computeStreaks(sessions), [sessions]);
  const weeks = useMemo(() => generateCalendarGrid(), []);

  const handleMouseEnter = (e: React.MouseEvent, date: string) => {
    const day = calendarData.get(date) || { date, sessionCount: 0, avgWpm: 0, avgAccuracy: 0 };
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({ day, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  const handleMouseLeave = () => setTooltip(null);

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-neutral-200">Activity</h2>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faFire} className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-neutral-200">{streaks.current} day{streaks.current !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-neutral-400">Best: {streaks.longest}</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2" role="img" aria-label={`Activity calendar: ${streaks.current} day streak, ${streaks.longest} longest`}>
        <div className="inline-grid grid-flow-col gap-[3px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-rows-7 gap-[3px]">
              {week.map((date) => {
                const day = calendarData.get(date);
                const count = day?.sessionCount ?? 0;
                return (
                  <div
                    key={date}
                    className={`w-3 h-3 rounded-sm ${getIntensityClass(count)} transition-colors`}
                    onMouseEnter={(e) => handleMouseEnter(e, date)}
                    onMouseLeave={handleMouseLeave}
                    aria-label={`${date}: ${count} session${count !== 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mt-2 text-xs text-neutral-500">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-neutral-800/40" />
          <div className="w-3 h-3 rounded-sm bg-[#00ff88]/20" />
          <div className="w-3 h-3 rounded-sm bg-[#00ff88]/50" />
          <div className="w-3 h-3 rounded-sm bg-[#00ff88]/80" />
          <span>More</span>
        </div>
      </div>

      <div
        className={`fixed z-50 px-3 py-2 text-xs text-neutral-200 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg pointer-events-none transition-opacity ${tooltip?.day ? "opacity-100" : "opacity-0"}`}
        style={{ left: tooltip?.x ?? 0, top: (tooltip?.y ?? 0) - 8, transform: "translate(-50%, -100%)" }}
        aria-hidden={!tooltip?.day}
      >
        {tooltip?.day && (
          <>
            <p className="font-medium">{new Date(tooltip.day.date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
            {tooltip.day.sessionCount > 0 ? (
              <p className="text-neutral-400">{tooltip.day.sessionCount} session{tooltip.day.sessionCount !== 1 ? "s" : ""} ({tooltip.day.avgWpm} WPM avg)</p>
            ) : (
              <p className="text-neutral-500">No sessions</p>
            )}
          </>
        )}
      </div>
    </div>
  );
});
