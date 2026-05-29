"use client";

import { memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHand } from "@fortawesome/free-solid-svg-icons";
import { getWeakFingers } from "@/lib/finger-load";

interface FingerLoadCardProps {
  errorHeatmap: Record<string, number>;
}

const FINGER_MAP: Record<string, string> = {
  q: "L Pinky", a: "L Pinky", z: "L Pinky", "1": "L Pinky",
  w: "L Ring", s: "L Ring", x: "L Ring", "2": "L Ring",
  e: "L Middle", d: "L Middle", c: "L Middle", "3": "L Middle",
  r: "L Index", f: "L Index", v: "L Index", t: "L Index", g: "L Index", b: "L Index", "4": "L Index", "5": "L Index",
  y: "R Index", h: "R Index", n: "R Index", u: "R Index", j: "R Index", m: "R Index", "6": "R Index", "7": "R Index",
  i: "R Middle", k: "R Middle", ",": "R Middle", "8": "R Middle",
  o: "R Ring", l: "R Ring", ".": "R Ring", "9": "R Ring",
  p: "R Pinky", ";": "R Pinky", "/": "R Pinky", "0": "R Pinky", "'": "R Pinky",
};

const FINGER_ORDER = ["L Pinky", "L Ring", "L Middle", "L Index", "R Index", "R Middle", "R Ring", "R Pinky"];

interface FingerErrors { finger: string; errors: number; keys: string[] }

export default memo(function FingerLoadCard({ errorHeatmap }: FingerLoadCardProps) {
  const fingerData = useMemo(() => {
    const data: Record<string, { errors: number; keys: string[] }> = {};
    for (const [key, errors] of Object.entries(errorHeatmap)) {
      const finger = FINGER_MAP[key.toLowerCase()] || null;
      if (!finger) continue;
      if (!data[finger]) data[finger] = { errors: 0, keys: [] };
      data[finger].errors += errors;
      if (!data[finger].keys.includes(key)) data[finger].keys.push(key);
    }
    return FINGER_ORDER
      .filter((f) => data[f])
      .map((f) => ({ finger: f, errors: data[f].errors, keys: data[f].keys }));
  }, [errorHeatmap]);

  if (fingerData.length === 0) return null;

  const maxErrors = Math.max(...fingerData.map((f) => f.errors));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
        <FontAwesomeIcon icon={faHand} className="w-4 h-4 text-cyan-400" />
        Finger Error Distribution
      </h2>

      <div className="space-y-2">
        {fingerData.map((f) => (
          <div key={f.finger} className="flex items-center gap-3">
            <span className={`text-xs w-16 shrink-0 ${f.errors > maxErrors * 0.6 ? "text-red-400" : "text-neutral-400"}`}>
              {f.finger}
            </span>
            <div className="flex-1 h-3 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${f.errors > maxErrors * 0.6 ? "bg-red-400/70" : f.errors > maxErrors * 0.3 ? "bg-amber-400/70" : "bg-[#00ff88]/50"}`}
                style={{ width: `${(f.errors / maxErrors) * 100}%` }}
              />
            </div>
            <span className="text-xs text-neutral-300 w-8 text-right">{f.errors}</span>
            <span className="text-[10px] text-neutral-600 w-16 truncate" title={f.keys.join(", ")}>{f.keys.join("")}</span>
          </div>
        ))}
      </div>

      {fingerData.some((f) => f.errors > maxErrors * 0.6) && (
        <p className="text-xs text-red-400">
          Weakest: {fingerData.filter((f) => f.errors > maxErrors * 0.6).map((f) => f.finger).join(", ")}
        </p>
      )}
    </div>
  );
});
