"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts";
import type { EnrichedSessionSummary } from "@/lib/types";
import { computeRollingAverage } from "@/lib/analytics";

interface AccuracyChartProps {
  sessions: EnrichedSessionSummary[];
}

export default function AccuracyChart({ sessions }: AccuracyChartProps) {
  if (sessions.length < 2) return null;

  const sorted = [...sessions].sort((a, b) => (a.timestamp || a.date).localeCompare(b.timestamp || b.date));
  const rolling = computeRollingAverage(sorted, 7, "accuracy");

  const data = sorted.map((s, i) => ({
    date: s.date,
    accuracy: s.accuracy,
    rolling: rolling[i]?.value ?? null,
  }));

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-neutral-400 uppercase tracking-wider text-center">Accuracy Over Time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <ReferenceArea y1={95} y2={100} fill="#00ff88" fillOpacity={0.05} />
          <ReferenceArea y1={80} y2={95} fill="#f59e0b" fillOpacity={0.03} />
          <XAxis dataKey="date" tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={[60, 100]} tick={{ fill: "#a3a3a3", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: "#141414", border: "1px solid #333", borderRadius: "8px" }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#00ff88" }}
            cursor={{ stroke: "#333", strokeWidth: 1 }}
          />
          <Line type="monotone" dataKey="accuracy" stroke="#00ff88" strokeWidth={1.5} dot={false} name="Accuracy %" />
          <Line type="monotone" dataKey="rolling" stroke="#00cc6a" strokeWidth={2} dot={false} strokeDasharray="5 5" name="7-day avg" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
