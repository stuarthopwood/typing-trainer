"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

interface ErrorDistributionProps {
  errorHeatmap: Record<string, number>;
}

export default function ErrorDistribution({ errorHeatmap }: ErrorDistributionProps) {
  const entries = Object.entries(errorHeatmap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  if (entries.length === 0) return null;

  const data = entries.map(([key, count]) => ({
    key: key === " " ? "Space" : key,
    errors: count,
  }));

  return (
    <div className="space-y-2">
      <h2 className="text-sm text-neutral-500 uppercase tracking-wider text-center">Most Missed Keys</h2>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
          <XAxis type="number" tick={{ fill: "#737373", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="key" tick={{ fill: "#a3a3a3", fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            contentStyle={{ backgroundColor: "#141414", border: "1px solid #333", borderRadius: "8px" }}
            labelStyle={{ color: "#999" }}
            itemStyle={{ color: "#ef4444" }}
          />
          <Bar dataKey="errors" fill="#ef4444" radius={[0, 4, 4, 0]} name="Errors" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
