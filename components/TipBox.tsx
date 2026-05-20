"use client";

import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";
import GlowBorder from "./GlowBorder";

interface TipBoxProps {
  tip: string | null;
  loading?: boolean;
}

export default memo(function TipBox({ tip, loading }: TipBoxProps) {
  if (!tip && !loading) return null;

  return (
    <div className="fixed top-14 right-4 sm:right-6 max-w-xs z-20">
      <GlowBorder radius="0.5rem" intensity="subtle">
        <div className="flex items-start gap-2 px-3 py-2 bg-[#141414]/95 border border-neutral-700/50 rounded-lg backdrop-blur-sm shadow-lg">
          <FontAwesomeIcon icon={faLightbulb} className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          {loading ? (
            <span className="text-xs text-neutral-500 italic">Analysing patterns...</span>
          ) : (
            <span className="text-xs text-neutral-300 leading-relaxed">{tip}</span>
          )}
        </div>
      </GlowBorder>
    </div>
  );
});
