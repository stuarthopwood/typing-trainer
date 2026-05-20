"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";

interface GlowBorderProps {
  children: ReactNode;
  className?: string;
  radius?: string;
  intensity?: "subtle" | "normal" | "punchy";
}

export default function GlowBorder({
  children,
  className = "",
  radius = "0.75rem",
  intensity = "normal",
}: GlowBorderProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    el.style.setProperty("--glow-opacity", "1");
  };

  const handleLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--glow-opacity", "0");
  };

  const style: CSSProperties = {
    "--glow-radius": radius,
    "--glow-spot": intensity === "subtle" ? "180px" : intensity === "punchy" ? "320px" : "240px",
    "--glow-alpha": intensity === "subtle" ? "0.5" : intensity === "punchy" ? "1" : "0.8",
  } as CSSProperties;

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={`glow-border ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
