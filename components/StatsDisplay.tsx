"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGauge, faBullseye, faFire, faClock } from "@fortawesome/free-solid-svg-icons";
import type { SessionStats } from "@/lib/types";

interface StatsDisplayProps {
  stats: SessionStats | null;
  liveWpm: number;
  liveAccuracy: number;
  isActive: boolean;
  elapsed: number;
  combo: number;
  sessionAvgWpm?: number;
  sessionAvgAccuracy?: number;
  allTimeBestWpm?: number;
  allTimeBestAccuracy?: number;
}

export default function StatsDisplay({ stats, liveWpm, liveAccuracy, isActive, elapsed, combo, sessionAvgWpm, sessionAvgAccuracy, allTimeBestWpm, allTimeBestAccuracy }: StatsDisplayProps) {
  const wpm = stats?.wpm ?? liveWpm;
  const accuracy = stats?.accuracy ?? liveAccuracy;
  const time = stats ? Math.round(stats.duration / 1000) : Math.round(elapsed / 1000);

  return (
    <div className="space-y-3" aria-live={stats ? "polite" : "off"} aria-atomic="true">
      <div className="flex items-center justify-center gap-10 sm:gap-16 py-6">
        <Stat
          icon={faGauge}
          value={wpm}
          label="WPM"
          active={isActive}
          color="text-emerald-400"
        />
        <Stat
          icon={faBullseye}
          value={`${accuracy}%`}
          label="Accuracy"
          active={isActive}
          color={accuracy >= 95 ? "text-emerald-400" : accuracy >= 80 ? "text-amber-400" : "text-red-400"}
        />
        <Stat
          icon={faClock}
          value={`${time}s`}
          label="Time"
          active={isActive}
          color="text-neutral-500"
        />
        {combo > 2 && (
          <Stat
            icon={faFire}
            value={combo}
            label="Combo"
            active={true}
            color="text-orange-400"
          />
        )}
      </div>
      {(sessionAvgWpm !== undefined || allTimeBestWpm !== undefined) && (
        <div className="flex items-center justify-center gap-8 text-xs text-neutral-500">
          {sessionAvgWpm !== undefined && (
            <span>Session avg: <strong className="text-neutral-400">{sessionAvgWpm} WPM</strong> / <strong className="text-neutral-400">{sessionAvgAccuracy}%</strong></span>
          )}
          {allTimeBestWpm !== undefined && allTimeBestWpm > 0 && (
            <span>All-time best: <strong className="text-neutral-400">{allTimeBestWpm} WPM</strong> / <strong className="text-neutral-400">{allTimeBestAccuracy}%</strong></span>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
  active,
  color,
}: {
  icon: typeof faGauge;
  value: string | number;
  label: string;
  active?: boolean;
  color: string;
}) {
  return (
    <div className={`text-center transition-opacity ${active ? "opacity-100" : "opacity-40"}`}>
      <div className={`text-4xl sm:text-5xl font-bold ${color}`}>
        {value}
      </div>
      <div className="text-xs text-neutral-500 mt-1 flex items-center justify-center gap-1">
        <FontAwesomeIcon icon={icon} className="w-3 h-3" />
        {label}
      </div>
    </div>
  );
}
