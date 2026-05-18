"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { EnrichedSessionSummary } from "@/lib/types";

interface BigramChartProps {
  sessions: EnrichedSessionSummary[];
}

export default function BigramChart({ sessions }: BigramChartProps) {
  const bigramMap: Record<string, { totalDelay: number; count: number }> = {};

  for (const s of sessions) {
    if (!s.timingMetadata?.slowestBigrams) continue;
    for (const b of s.timingMetadata.slowestBigrams) {
      if (!bigramMap[b.bigram]) bigramMap[b.bigram] = { totalDelay: 0, count: 0 };
      bigramMap[b.bigram].totalDelay += b.avgDelay * b.occurrences;
      bigramMap[b.bigram].count += b.occurrences;
    }
  }

  const data = Object.entries(bigramMap)
    .map(([bigram, { totalDelay, count }]) => ({
      bigram: `"${bigram}"`,
      avgMs: Math.round(totalDelay / count),
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 10);

  if (data.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Slowest Key Pairs</h2>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
          <XAxis type="number" tick={{ fill: "#737373", fontSize: 10 }} tickLine={false} axisLine={false} unit="ms" />
          <YAxis type="category" dataKey="bigram" tick={{ fill: "#a3a3a3", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ backgroundColor: "#141414", border: "1px solid #333", borderRadius: "8px" }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#f59e0b" }}
            formatter={(value) => [`${value}ms`, "Avg delay"]}
            cursor={false}
          />
          <Bar dataKey="avgMs" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Avg delay" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
