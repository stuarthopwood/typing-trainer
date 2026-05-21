"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceDot } from "recharts";
import type { EnrichedSessionSummary } from "@/lib/types";
import { computeRollingAverage, findPersonalRecords } from "@/lib/analytics";

interface WpmChartProps {
  sessions: EnrichedSessionSummary[];
}

export default function WpmChart({ sessions }: WpmChartProps) {
  if (sessions.length < 2) return null;

  const sorted = [...sessions].sort((a, b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));
  const rolling = computeRollingAverage(sorted, 7, "wpm");
  const records = findPersonalRecords(sorted).filter((r) => r.type === "wpm");

  const data = sorted.map((s, i) => ({
    date: s.date,
    wpm: s.wpm,
    rolling: rolling[i]?.value ?? null,
  }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-neutral-400 uppercase tracking-wider text-center">WPM Over Time</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#141414", border: "1px solid #333", borderRadius: "8px" }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#00ff88" }}
            cursor={{ stroke: "#333", strokeWidth: 1 }}
          />
          <Line type="monotone" dataKey="wpm" stroke="#00ff88" strokeWidth={1.5} dot={false} name="WPM" />
          <Line type="monotone" dataKey="rolling" stroke="#00cc6a" strokeWidth={2} dot={false} strokeDasharray="5 5" name="7-day avg" />
          {records.map((r, i) => (
            <ReferenceDot key={i} x={r.date} y={r.value} r={4} fill="#00ff88" stroke="none" />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
