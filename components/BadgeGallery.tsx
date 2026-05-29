"use client";

import { memo } from "react";
import BadgeIcon from "./BadgeIcon";
import { BADGE_DEFINITIONS } from "@/lib/badges";
import type { BadgeProgress } from "@/lib/types";

interface BadgeGalleryProps {
  badges: BadgeProgress[];
}

export default memo(function BadgeGallery({ badges }: BadgeGalleryProps) {
  const earnedIds = new Set(badges.map((b) => b.id));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-neutral-200">Level Badges</h2>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
        {BADGE_DEFINITIONS.map((def) => {
          const earned = earnedIds.has(def.id);
          const progress = badges.find((b) => b.id === def.id);
          return (
            <div
              key={def.id}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${earned ? "bg-[#00ff88]/5 border border-[#00ff88]/20" : "bg-neutral-800/30 border border-neutral-700/30"}`}
              title={earned ? `${def.name} — ${def.subtitle}` : `Level ${def.level} to unlock`}
            >
              <BadgeIcon badge={def} locked={!earned} size="lg" />
              <div className="text-center">
                <p className={`text-xs font-medium ${earned ? "text-neutral-200" : "text-neutral-500"}`}>
                  {earned ? def.name : `Lv.${def.level}`}
                </p>
                {earned && (
                  <p className="text-[10px] text-neutral-500">{def.subtitle}</p>
                )}
                {earned && progress?.unlockedAt && (
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {new Date(progress.unlockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
