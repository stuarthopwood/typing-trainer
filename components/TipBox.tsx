"use client";

import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

interface TipBoxProps {
  tip: string | null;
  loading?: boolean;
}

export default memo(function TipBox({ tip, loading }: TipBoxProps) {
  if (!tip && !loading) return null;

  return (
    <div className="absolute top-2 right-2 max-w-xs z-10">
      <div className="flex items-start gap-2 px-3 py-2 bg-[#141414]/90 border border-neutral-700/50 rounded-lg backdrop-blur-sm">
        <FontAwesomeIcon icon={faLightbulb} className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
        {loading ? (
          <span className="text-xs text-neutral-500 italic">Analysing patterns...</span>
        ) : (
          <span className="text-xs text-neutral-300 leading-relaxed">{tip}</span>
        )}
      </div>
    </div>
  );
});
