"use client";

import { memo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solidIcons from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { BadgeDefinition } from "@/lib/types";

function resolveIcon(name: string): IconDefinition {
  return (solidIcons as unknown as Record<string, IconDefinition>)[name] ?? solidIcons.faQuestion;
}

interface BadgeIconProps {
  badge: BadgeDefinition;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };

export default memo(function BadgeIcon({ badge, locked = false, size = "md" }: BadgeIconProps) {
  const sizeClass = SIZE_MAP[size];

  return (
    <span
      className={`relative inline-flex items-center justify-center ${sizeClass} ${locked ? "opacity-30 grayscale" : ""}`}
      aria-label={locked ? `Locked badge: Level ${badge.level}` : `Badge: ${badge.name}`}
      role="img"
    >
      <span className="fa-layers fa-fw w-full h-full flex items-center justify-center">
        {badge.layers.map((layer, i) => (
          <FontAwesomeIcon
            key={i}
            icon={resolveIcon(layer.icon)}
            transform={layer.transform}
            style={{
              color: locked ? "#4b5563" : layer.color,
              opacity: locked ? 0.5 : (layer.opacity ?? 1),
            }}
            className="absolute"
          />
        ))}
      </span>
      {!locked && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: "0 0 12px rgba(0, 255, 136, 0.4), 0 0 4px rgba(0, 255, 136, 0.2)" }}
          aria-hidden="true"
        />
      )}
    </span>
  );
});
