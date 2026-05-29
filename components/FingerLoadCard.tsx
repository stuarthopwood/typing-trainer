"use client";

import { memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHand } from "@fortawesome/free-solid-svg-icons";
import { computeFingerLoad, getOverloadedFingers, getWeakFingers, type FingerLoad } from "@/lib/finger-load";
import type { EnrichedSessionSummary, KeyStroke } from "@/lib/types";

interface FingerLoadCardProps {
  sessions: EnrichedSessionSummary[];
}

export default memo(function FingerLoadCard({ sessions }: FingerLoadCardProps) {
  const loads = useMemo(() => {
    const allStrokes: KeyStroke[] = [];
    for (const s of sessions.slice(0, 20)) {
      const strokes = (s as unknown as { keyStrokes?: KeyStroke[] }).keyStrokes;
      if (Array.isArray(strokes)) allStrokes.push(...strokes);
    }
    if (allStrokes.length < 50) return null;
    return computeFingerLoad(allStrokes);
  }, [sessions]);

  if (!loads || loads.length === 0) return null;

  const overloaded = getOverloadedFingers(loads);
  const weak = getWeakFingers(loads);
  const maxLoad = Math.max(...loads.map((l) => l.percentage));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
        <FontAwesomeIcon icon={faHand} className="w-4 h-4 text-cyan-400" />
        Finger Load Balance
      </h2>

      <div className="space-y-2">
        {loads.map((load) => (
          <div key={load.finger} className="flex items-center gap-3">
            <span className={`text-xs w-16 shrink-0 ${overloaded.includes(load.finger) ? "text-amber-400" : weak.includes(load.finger) ? "text-red-400" : "text-neutral-400"}`}>
              {load.finger}
            </span>
            <div className="flex-1 h-3 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  weak.includes(load.finger) ? "bg-red-400/70" : overloaded.includes(load.finger) ? "bg-amber-400/70" : "bg-[#00ff88]/50"
                }`}
                style={{ width: `${(load.percentage / maxLoad) * 100}%` }}
              />
            </div>
            <span className="text-xs text-neutral-300 w-8 text-right">{load.percentage}%</span>
            <span className={`text-xs w-10 text-right ${load.accuracy < 85 ? "text-red-400" : "text-neutral-500"}`}>
              {load.accuracy}%
            </span>
          </div>
        ))}
      </div>

      {(overloaded.length > 0 || weak.length > 0) && (
        <div className="space-y-1 text-xs">
          {overloaded.length > 0 && (
            <p className="text-amber-400">Overloaded: {overloaded.join(", ")}</p>
          )}
          {weak.length > 0 && (
            <p className="text-red-400">Needs work: {weak.join(", ")} (&lt;85% accuracy)</p>
          )}
        </div>
      )}
    </div>
  );
});
