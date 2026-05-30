"use client";

import { useState, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import GlowBorder from "@/components/GlowBorder";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlowBorder radius="0.75rem" intensity="normal" className={className}>
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-5 h-full">
        {children}
      </div>
    </GlowBorder>
  );
}

export function BigStat({
  icon,
  value,
  label,
  color = "text-neutral-200",
}: {
  icon?: IconDefinition;
  value: string | number;
  label: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-3xl sm:text-4xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-neutral-400 mt-1 flex items-center justify-center gap-1">
        {icon && <FontAwesomeIcon icon={icon} className="w-3 h-3" />}
        {label}
      </div>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <Panel>
      <p className="text-center text-sm text-neutral-400 py-8">{message}</p>
    </Panel>
  );
}

export function TipItem({
  text,
  explanation,
  date,
}: {
  text: string;
  explanation?: string;
  date: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasExplanation = !!explanation;

  // Focus-visible ring on the role="button" wrapper is required because
  // the global focus style only targets <button>/<a>, not div[role=button].
  // motion-safe: prefix on transition classes honours prefers-reduced-motion.
  const baseClasses = "rounded-lg motion-safe:transition-colors bg-neutral-800/40";
  const interactiveClasses = hasExplanation
    ? "cursor-pointer hover:bg-neutral-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff88]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0d]"
    : "";

  return (
    <div
      className={`${baseClasses} ${interactiveClasses}`.trim()}
      onClick={() => hasExplanation && setExpanded(!expanded)}
      onKeyDown={(e) => {
        if (hasExplanation && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setExpanded(!expanded);
        }
      }}
      tabIndex={hasExplanation ? 0 : undefined}
      role={hasExplanation ? "button" : undefined}
      aria-expanded={hasExplanation ? expanded : undefined}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="text-amber-400 mt-0.5 text-sm">💡</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-neutral-300">{text}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">{date}</p>
        </div>
        {hasExplanation && (
          <span
            className={`text-neutral-600 text-xs mt-1 motion-safe:transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        )}
      </div>
      {expanded && explanation && (
        <div className="px-3 pb-3 pt-0 ml-7">
          <p className="text-xs text-neutral-400 leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}
