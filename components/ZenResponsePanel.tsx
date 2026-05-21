"use client";

import { memo, useEffect, useRef } from "react";
import { extractWords, type SpellCheckResult } from "@/lib/zen";

interface ZenResponsePanelProps {
  text: string;
  spellResults: Map<number, SpellCheckResult>;
}

export default memo(function ZenResponsePanel({ text, spellResults }: ZenResponsePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [text]);

  if (!text) {
    return (
      <div className="h-64 rounded-xl bg-[#141414] border border-neutral-800/50 flex items-center justify-center">
        <p className="text-sm text-neutral-500 italic">Your response will appear here...</p>
      </div>
    );
  }

  const words = extractWords(text);
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const w of words) {
    if (w.startIndex > lastEnd) {
      parts.push(<span key={`ws-${lastEnd}`}>{text.slice(lastEnd, w.startIndex)}</span>);
    }
    const result = spellResults.get(w.startIndex);
    const isMisspelled = result && !result.correct;
    parts.push(
      <span
        key={`w-${w.startIndex}`}
        className={isMisspelled ? "underline decoration-red-500 decoration-2 underline-offset-4" : ""}
      >
        {text.slice(w.startIndex, w.endIndex)}
      </span>
    );
    lastEnd = w.endIndex;
  }
  if (lastEnd < text.length) {
    parts.push(<span key={`ws-${lastEnd}`}>{text.slice(lastEnd)}</span>);
  }

  return (
    <div
      ref={containerRef}
      className="h-64 rounded-xl bg-[#141414] border border-neutral-800/50 p-5 overflow-y-auto text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap break-words font-[family-name:var(--font-inter)]"
    >
      {parts}
    </div>
  );
});
