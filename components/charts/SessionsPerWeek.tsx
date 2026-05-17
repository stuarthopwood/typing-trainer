"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { EnrichedSessionSummary } from "@/lib/types";

interface SessionsPerWeekProps {
  sessions: EnrichedSessionSummary[];
}

export default function SessionsPerWeek({ sessions }: SessionsPerWeekProps) {
  if (sessions.length < 2) return null;

  const byWeek: Record<string, number> = {};
  for (const s of sessions) {
    const d = new Date(s.date);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const week = weekStart.toISOString().split("T")[0];
    byWeek[week] = (byWeek[week] || 0) + 1;
  }

  const data = Object.entries(byWeek)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([week, count]) => ({ week: week.slice(5), count }));

  return (
    <div className="space-y-2">
      <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Sessions Per Week</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="week" tick={{ fill: "#737373", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#737373", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#141414", border: "1px solid #333", borderRadius: "8px" }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#00ff88" }}
            cursor={false}
          />
          <Bar dataKey="count" fill="#00ff88" radius={[4, 4, 0, 0]} name="Sessions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
