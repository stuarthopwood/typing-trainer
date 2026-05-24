"use client";

import { memo, useEffect, useRef } from "react";
import BadgeIcon from "./BadgeIcon";
import type { BadgeDefinition } from "@/lib/types";

interface BadgeToastProps {
  badge: BadgeDefinition | null;
}

export default memo(function BadgeToast({ badge }: BadgeToastProps) {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (!badge || confettiFired.current) return;
    confettiFired.current = true;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    import("canvas-confetti").then(({ default: confetti }) => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.3 },
        colors: ["#00ff88", "#22d3ee", "#6366f1", "#fbbf24"],
        disableForReducedMotion: true,
      });
    });
  }, [badge]);

  useEffect(() => {
    if (!badge) confettiFired.current = false;
  }, [badge]);

  if (!badge) return null;

  return (
    <div
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-4 px-6 py-4 bg-neutral-900/95 border border-[#00ff88]/30 rounded-xl shadow-[0_0_20px_rgba(0,255,136,0.2)] backdrop-blur-sm">
        <BadgeIcon badge={badge} size="lg" />
        <div>
          <p className="text-sm font-bold text-[#00ff88]">New Badge Unlocked!</p>
          <p className="text-base font-semibold text-neutral-100">{badge.name}</p>
          <p className="text-xs text-neutral-400 italic">{badge.subtitle}</p>
        </div>
      </div>
    </div>
  );
});
