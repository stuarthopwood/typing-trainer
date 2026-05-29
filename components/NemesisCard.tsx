"use client";

import { memo, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSkull, faTrophy } from "@fortawesome/free-solid-svg-icons";
import { computeNemesis, type NemesisRecord } from "@/lib/nemesis";

interface NemesisCardProps {
  errorHeatmap: Record<string, number>;
}

export default memo(function NemesisCard({ errorHeatmap }: NemesisCardProps) {
  const nemesis = useMemo(() => computeNemesis(errorHeatmap), [errorHeatmap]);

  if (!nemesis) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
          <FontAwesomeIcon icon={faSkull} className="w-4 h-4 text-neutral-500" />
          Nemesis Key
        </h2>
        <p className="text-sm text-neutral-500 italic">No nemesis yet — keep practising to identify your weakest key</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-neutral-200 flex items-center gap-2">
        <FontAwesomeIcon icon={faSkull} className="w-4 h-4 text-red-400" />
        Nemesis Key
      </h2>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center relative">
          <span className="text-2xl font-bold text-red-400 font-[family-name:var(--font-typing)]">
            {nemesis.key === " " ? "⎵" : nemesis.key}
          </span>
          <FontAwesomeIcon icon={faSkull} className="absolute -top-1 -right-1 w-3 h-3 text-red-400" />
        </div>
        <div>
          <p className="text-sm text-neutral-300">
            <span className="font-bold text-red-400">{nemesis.accuracy}%</span> accuracy
          </p>
          <p className="text-xs text-neutral-500">{nemesis.attempts} attempts tracked</p>
          <p className="text-xs text-neutral-400 mt-1">
            {nemesis.accuracy < 70 ? "This key owns you." : nemesis.accuracy < 85 ? "Getting closer to defeating it..." : "Almost there — 85% to defeat!"}
          </p>
        </div>
      </div>
    </div>
  );
});
