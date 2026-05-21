"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { EnrichedSessionSummary } from "@/lib/types";

interface ModeBreakdownProps {
  sessions: EnrichedSessionSummary[];
}

const COLORS = ["#00ff88", "#00cc6a", "#009950", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function ModeBreakdown({ sessions }: ModeBreakdownProps) {
  if (sessions.length < 2) return null;

  const byMode: Record<string, number> = {};
  for (const s of sessions) {
    const label = s.modeDetails
      ? `${s.modeDetails.type}${s.modeDetails.level ? `: ${s.modeDetails.level}` : ""}`
      : s.mode;
    byMode[label] = (byMode[label] || 0) + 1;
  }

  const data = Object.entries(byMode)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-2">
      <h3 className="text-sm text-neutral-400 uppercase tracking-wider text-center">Mode Breakdown</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: "#141414", border: "1px solid #333", borderRadius: "8px" }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#ccc" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3 text-xs">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-neutral-400">{d.name} ({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
