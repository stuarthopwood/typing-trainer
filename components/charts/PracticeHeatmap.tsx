"use client";

import type { EnrichedSessionSummary } from "@/lib/types";

interface PracticeHeatmapProps {
  sessions: EnrichedSessionSummary[];
}

export default function PracticeHeatmap({ sessions }: PracticeHeatmapProps) {
  if (sessions.length === 0) return null;

  const countByDate: Record<string, number> = {};
  for (const s of sessions) {
    countByDate[s.date] = (countByDate[s.date] || 0) + 1;
  }

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const weeks: { date: Date; count: number }[][] = [];
  let currentWeek: { date: Date; count: number }[] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const dateStr = cursor.toISOString().split("T")[0];
    currentWeek.push({ date: new Date(cursor), count: countByDate[dateStr] || 0 });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  if (currentWeek.length > 0) weeks.push(currentWeek);

  const maxCount = Math.max(...Object.values(countByDate), 1);

  const getColor = (count: number): string => {
    if (count === 0) return "bg-neutral-800/50";
    const intensity = count / maxCount;
    if (intensity > 0.75) return "bg-[#00ff88]";
    if (intensity > 0.5) return "bg-[#00ff88]/70";
    if (intensity > 0.25) return "bg-[#00ff88]/40";
    return "bg-[#00ff88]/20";
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-neutral-400 uppercase tracking-wider text-center">Practice Activity</h3>
      <div className="overflow-x-auto" role="img" aria-label={`Practice activity heatmap for the past year. ${sessions.length} total sessions across ${Object.keys(countByDate).length} active days.`}>
        <div className="flex gap-[2px] justify-center min-w-fit">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-2.5 h-2.5 rounded-sm ${getColor(day.count)}`}
                  title={`${day.date.toISOString().split("T")[0]}: ${day.count} session${day.count !== 1 ? "s" : ""}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2 text-xs text-neutral-600">
        <span>Less</span>
        <div className="flex gap-[2px]">
          <div className="w-2.5 h-2.5 rounded-sm bg-neutral-800/50" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]/20" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]/40" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]/70" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#00ff88]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
